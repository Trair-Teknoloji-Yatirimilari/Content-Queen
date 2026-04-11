import Replicate from "replicate";

// ─── Types ───

export interface JobResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
}

export interface TrainingResult {
  trainingId: string;
  status: "pending" | "training" | "ready" | "failed";
  modelVersion?: string;
  error?: string;
}

// ─── Service ───

class ReplicateService {
  private client: Replicate | null = null;

  private getClient(): Replicate {
    if (!this.client) {
      const apiKey = process.env.REPLICATE_API_KEY;
      if (!apiKey) throw new Error("REPLICATE_API_KEY yapılandırılmadı");
      this.client = new Replicate({ auth: apiKey });
    }
    return this.client;
  }

  // ═══════════════════════════════════════════
  // AŞAMA 1: LoRA Training
  // ═══════════════════════════════════════════

  /**
   * Kullanıcının fotoğraflarıyla kişiye özel LoRA modeli train et.
   * Replicate fast-flux-trainer kullanır.
   *
   * @param zipUrl - Eğitim fotoğraflarının zip dosyası URL'i (S3'te)
   * @param destinationModel - "username/model-name" formatında hedef model
   */
  async trainLoRA(
    zipUrl: string,
    destinationModel: string,
  ): Promise<TrainingResult> {
    const client = this.getClient();

    try {
      console.log("[LoRA] Training başlatılıyor:", { zipUrl, destinationModel });

      const training = await client.trainings.create(
        "ostris",
        "flux-dev-lora-trainer",
        "7f53f82066bcdfb1c549245a624019c26ca6e3c8034235cd4826425b61e77bec",
        {
          destination: destinationModel as `${string}/${string}`,
          input: {
            input_images: zipUrl,
            trigger_word: "TOK",
            steps: 1000,
            lora_rank: 16,
            optimizer: "adamw8bit",
            batch_size: 1,
            resolution: "512,768,1024",
            autocaption: true,
            autocaption_prefix: "a photo of TOK,",
            learning_rate: 0.0004,
          },
        },
      );

      console.log("[LoRA] Training oluşturuldu:", training.id, training.status);

      return {
        trainingId: training.id,
        status: this.mapTrainingStatus(training.status),
      };
    } catch (error) {
      console.error("[LoRA] Training başlatma hatası:", error);
      return {
        trainingId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Training başlatılamadı",
      };
    }
  }

  /**
   * LoRA training durumunu kontrol et.
   */
  async checkTrainingStatus(trainingId: string): Promise<TrainingResult> {
    const client = this.getClient();

    try {
      const training = await client.trainings.get(trainingId);

      return {
        trainingId: training.id,
        status: this.mapTrainingStatus(training.status),
        modelVersion: (training as any).output?.version ?? undefined,
        error: training.error as string | undefined,
      };
    } catch (error) {
      console.error("[LoRA] Training durum kontrol hatası:", error);
      return {
        trainingId,
        status: "failed",
        error: error instanceof Error ? error.message : "Durum kontrol edilemedi",
      };
    }
  }

  private mapTrainingStatus(status: string): TrainingResult["status"] {
    switch (status) {
      case "starting":
      case "queued":
        return "pending";
      case "processing":
        return "training";
      case "succeeded":
        return "ready";
      case "failed":
      case "canceled":
        return "failed";
      default:
        return "pending";
    }
  }

  // ═══════════════════════════════════════════
  // AŞAMA 2: LoRA + ControlNet ile Görsel Üretimi
  // ═══════════════════════════════════════════

  /**
   * Kişiye özel LoRA modeli ile görsel üret.
   * Referans fotoğraftaki poz ve kompozisyonu korur.
   *
   * @param loraModelVersion - Train edilmiş LoRA model version ID
   * @param referenceImageUrl - Referans fotoğraf (poz/ortam kaynağı)
   * @param prompt - Ek prompt açıklaması
   */
  async generateWithLoRA(
    loraModelVersion: string,
    referenceImageUrl: string,
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      loraScale?: number;
      steps?: number;
      guidance?: number;
    },
  ): Promise<JobResult> {
    const client = this.getClient();

    try {
      console.log("[Generate] LoRA ile görsel üretimi:", {
        loraModelVersion: loraModelVersion.substring(0, 30) + "...",
        prompt: prompt.substring(0, 50) + "...",
      });

      // LoRA modeli ile prediction oluştur
      const prediction = await client.predictions.create({
        version: loraModelVersion,
        input: {
          prompt: `a photo of TOK ${prompt}`,
          image: referenceImageUrl,
          num_outputs: 1,
          num_inference_steps: options?.steps ?? 28,
          guidance_scale: options?.guidance ?? 3.5,
          lora_scale: options?.loraScale ?? 0.8,
          output_format: "webp",
          output_quality: 90,
        },
      });

      console.log("[Generate] Prediction oluşturuldu:", prediction.id);

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: this.extractImageUrl(prediction.output),
      };
    } catch (error) {
      console.error("[Generate] LoRA görsel üretim hatası:", error);
      return {
        jobId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Görsel üretilemedi",
      };
    }
  }

  /**
   * LoRA olmadan standart Flux ile görsel üret (fallback).
   */
  async generateStandard(
    prompt: string,
    referenceImageUrl?: string,
  ): Promise<JobResult> {
    const client = this.getClient();

    try {
      const prediction = await client.predictions.create({
        model: "black-forest-labs/flux-dev",
        input: {
          prompt,
          image: referenceImageUrl,
          num_outputs: 1,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          output_format: "webp",
          output_quality: 90,
        },
      });

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: this.extractImageUrl(prediction.output),
      };
    } catch (error) {
      console.error("[Generate] Standart görsel üretim hatası:", error);
      return {
        jobId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Görsel üretilemedi",
      };
    }
  }

  // ═══════════════════════════════════════════
  // Ortak Yardımcılar
  // ═══════════════════════════════════════════

  /**
   * Prediction durumunu kontrol et (training veya generation).
   */
  async checkJobStatus(jobId: string): Promise<JobResult> {
    const client = this.getClient();

    try {
      const prediction = await client.predictions.get(jobId);

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: this.extractImageUrl(prediction.output),
        error: prediction.error as string | undefined,
      };
    } catch (error) {
      console.error("[Status] Durum kontrol hatası:", error);
      return {
        jobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Durum kontrol edilemedi",
      };
    }
  }

  private extractImageUrl(output: unknown): string | undefined {
    if (Array.isArray(output) && output.length > 0) {
      return output[0] as string;
    }
    if (typeof output === "string") {
      return output;
    }
    return undefined;
  }
}

export const replicateService = new ReplicateService();

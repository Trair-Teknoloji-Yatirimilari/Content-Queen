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
  weightsUrl?: string;
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

      // Hedef modeli oluştur (yoksa)
      const [owner, name] = destinationModel.split("/");
      try {
        await client.models.create(owner, name, {
          visibility: "private",
          hardware: "cpu",
        });
        console.log("[LoRA] Model oluşturuldu:", destinationModel);
      } catch (e: any) {
        // Model zaten varsa 409 döner, sorun değil
        if (e?.response?.status !== 409 && !e?.message?.includes("already exists")) {
          console.log("[LoRA] Model zaten mevcut veya oluşturma atlandı:", e?.message);
        }
      }

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
    } catch (error: any) {
      console.error("[LoRA] Training başlatma hatası:", error?.message || error);
      if (error?.response) {
        try {
          const body = await error.response.text?.() || JSON.stringify(error.response);
          console.error("[LoRA] Response body:", body);
        } catch {}
      }
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
        weightsUrl: (training as any).output?.weights ?? undefined,
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
      loraWeightsUrl?: string;
      steps?: number;
      guidance?: number;
    },
  ): Promise<JobResult> {
    const client = this.getClient();

    try {
      console.log("[Generate] LoRA + ControlNet ile görsel üretimi:", {
        loraModelVersion: loraModelVersion.substring(0, 40) + "...",
        prompt: prompt.substring(0, 50) + "...",
      });

      // xlabs-ai/flux-dev-controlnet: LoRA + Depth ControlNet birlikte
      // Depth map referans fotoğraftan otomatik çıkarılır (DepthAnything)
      // LoRA yüz/vücut benzerliğini sağlar
      const prediction = await client.predictions.create({
        model: "xlabs-ai/flux-dev-controlnet",
        input: {
          prompt: `a photo of TOK person, ${prompt}`,
          control_image: referenceImageUrl,
          control_type: "depth",
          control_strength: 0.65,
          lora_url: options?.loraWeightsUrl || "",
          lora_strength: 1.0,
          steps: options?.steps ?? 30,
          guidance_scale: options?.guidance ?? 3.5,
          output_format: "webp",
          output_quality: 95,
          negative_prompt: "low quality, ugly, distorted, blurry, wrong pose, different angle",
        },
      });

      console.log("[Generate] Prediction oluşturuldu:", prediction.id);

      return {
        jobId: prediction.id,
        status: this.mapJobStatus(prediction.status),
        imageUrl: this.extractImageUrl(prediction.output),
      };
    } catch (error: any) {
      console.error("[Generate] LoRA+ControlNet hatası:", error?.message);

      // Fallback: LoRA-only generation (ControlNet başarısız olursa)
      console.log("[Generate] Fallback: LoRA-only deneniyor...");
      try {
        const prediction = await client.predictions.create({
          version: loraModelVersion,
          input: {
            prompt: `a photo of TOK person, ${prompt}`,
            image: referenceImageUrl,
            num_outputs: 1,
            num_inference_steps: options?.steps ?? 30,
            guidance_scale: options?.guidance ?? 3.5,
            lora_scale: options?.loraScale ?? 0.95,
            prompt_strength: 0.55,
            output_format: "webp",
            output_quality: 95,
          },
        });

        return {
          jobId: prediction.id,
          status: this.mapJobStatus(prediction.status),
          imageUrl: this.extractImageUrl(prediction.output),
        };
      } catch (fallbackError: any) {
        console.error("[Generate] Fallback da başarısız:", fallbackError?.message);
        return {
          jobId: "",
          status: "failed",
          error: error?.message || "Görsel üretilemedi",
        };
      }
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
        status: this.mapJobStatus(prediction.status),
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
        status: this.mapJobStatus(prediction.status),
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

  private mapJobStatus(status: string): JobResult["status"] {
    switch (status) {
      case "starting":
      case "queued":
        return "pending";
      case "processing":
        return "processing";
      case "succeeded":
        return "completed";
      case "failed":
      case "canceled":
        return "failed";
      default:
        return "pending";
    }
  }
}

export const replicateService = new ReplicateService();

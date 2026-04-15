import Replicate from "replicate";

// ─── Types ───

export interface JobResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  imageUrls?: string[];
  error?: string;
}

/** Çoklu varyasyon sonucu */
export interface MultiJobResult {
  jobs: {
    jobId: string;
    status: string;
    imageUrl?: string;
    imageUrls?: string[];
    variant: string;
    loraScale: number;
    promptStrength: number;
  }[];
  status: "pending" | "processing" | "completed" | "failed";
}

export interface TrainingResult {
  trainingId: string;
  status: "pending" | "training" | "ready" | "failed";
  modelVersion?: string;
  weightsUrl?: string;
  error?: string;
}

// ─── Service ───

const WEBHOOK_URL = process.env.REPLICATE_WEBHOOK_URL || "https://contentqueen.com.tr/api/webhooks/replicate";

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
            steps: 800,
            lora_rank: 32,
            optimizer: "adamw8bit",
            batch_size: 1,
            resolution: "512,768,1024",
            autocaption: true,
            autocaption_prefix: "a photo of TOK person,",
            learning_rate: 0.0004,
          },
          webhook: WEBHOOK_URL,
          webhook_events_filter: ["completed"],
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
   * Kişiye özel LoRA modeli ile 3 farklı varyasyonda görsel üret.
   * Her varyasyon farklı lora_scale, prompt_strength ve prompt ile çalışır.
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

    // 2 varyasyon profili — net + dengeli
    const variants = [
      {
        name: "net",
        loraScale: 1.15,
        promptStrength: 0.40,
        prompt: `a photo of TOK person, ${prompt}, sharp focus, natural skin texture, detailed face, 8k uhd, professional photography, DSLR`,
        steps: 35,
        guidance: 4.5,
      },
      {
        name: "dengeli",
        loraScale: 1.1,
        promptStrength: 0.45,
        prompt: `a photo of TOK person, ${prompt}, natural lighting, professional photography`,
        steps: 32,
        guidance: 4.0,
      },
    ];

    try {
      console.log("[Generate] 2 varyasyonlu LoRA üretimi başlatılıyor:", {
        loraModelVersion: loraModelVersion.substring(0, 50) + "...",
        prompt: prompt.substring(0, 50) + "...",
      });

      // 3 prediction'ı paralel başlat
      const predictions = await Promise.all(
        variants.map(async (v) => {
          const prediction = await client.predictions.create({
            version: loraModelVersion,
            input: {
              prompt: v.prompt,
              image: referenceImageUrl,
              num_outputs: 1,
              num_inference_steps: options?.steps ?? v.steps,
              guidance_scale: options?.guidance ?? v.guidance,
              lora_scale: options?.loraScale ?? v.loraScale,
              prompt_strength: v.promptStrength,
              output_format: "webp",
              output_quality: 95,
            },
            webhook: WEBHOOK_URL,
            webhook_events_filter: ["completed"],
          });
          console.log(`[Generate] Varyasyon "${v.name}" oluşturuldu:`, prediction.id);
          return { prediction, variant: v.name, loraScale: v.loraScale, promptStrength: v.promptStrength };
        }),
      );

      // İlk prediction'ı ana jobId olarak kullan, diğerlerini metadata olarak ekle
      const primary = predictions[0];
      const allJobIds = predictions.map((p) => p.prediction.id);

      console.log("[Generate] 2 varyasyon başlatıldı:", allJobIds);

      return {
        jobId: primary.prediction.id,
        status: this.mapJobStatus(primary.prediction.status),
        imageUrl: this.extractImageUrl(primary.prediction.output),
        imageUrls: [],
        // Diğer job ID'leri metadata olarak ekliyoruz
        _variantJobs: predictions.map((p) => ({
          jobId: p.prediction.id,
          variant: p.variant,
          loraScale: p.loraScale,
          promptStrength: p.promptStrength,
        })),
      } as any;
    } catch (error: any) {
      console.error("[Generate] LoRA hatası:", error?.message);

      // Fallback: Standart Flux ile üret
      console.log("[Generate] Fallback: Standart Flux deneniyor...");
      try {
        return await this.generateStandard(
          `a photo of TOK person, ${prompt}`,
          referenceImageUrl,
        );
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

  // ═══════════════════════════════════════════
  // AŞAMA 3: Face Swap
  // ═══════════════════════════════════════════

  /**
   * Üretilen görseldeki yüzü kullanıcının gerçek yüzüyle değiştir.
   * codeplugtech/face-swap modeli kullanır.
   *
   * @param targetImageUrl - LoRA ile üretilen görsel (hedef)
   * @param faceImageUrl - Kullanıcının yüz fotoğrafı (kaynak)
   */
  async faceSwap(
    targetImageUrl: string,
    faceImageUrl: string,
  ): Promise<JobResult> {
    const client = this.getClient();

    try {
      console.log("[FaceSwap] Başlatılıyor:", {
        target: targetImageUrl.substring(0, 60) + "...",
        face: faceImageUrl.substring(0, 60) + "...",
      });

      const prediction = await client.predictions.create({
        version: "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
        input: {
          input_image: targetImageUrl,
          swap_image: faceImageUrl,
        },
      });

      const result = await client.wait(prediction);
      console.log("[FaceSwap] Tamamlandı:", result.id, result.status);
      console.log("[FaceSwap] Output:", JSON.stringify(result.output)?.substring(0, 200));

      return {
        jobId: result.id,
        status: this.mapJobStatus(result.status),
        imageUrl: this.extractImageUrl(result.output),
      };
    } catch (error: any) {
      console.error("[FaceSwap] Hata:", error?.message);
      return {
        jobId: "",
        status: "completed",
        imageUrl: targetImageUrl,
        error: "Face swap uygulanamadı, orijinal görsel kullanıldı",
      };
    }
  }

  /**
   * CodeFormer ile yüz restorasyonu + 2x upscale.
   * Face swap sonrası yüz detaylarını netleştirir, kimliği korur.
   * codeformer_fidelity: 0.9 = yüze çok sadık, minimal değişiklik.
   */
  async faceRestore(imageUrl: string): Promise<JobResult> {
    const client = this.getClient();

    try {
      console.log("[FaceRestore] CodeFormer başlatılıyor:", imageUrl.substring(0, 60) + "...");

      const prediction = await client.predictions.create({
        version: "78f2bab438ab0ffc85a68cdfd316a2ecd3994b5dd26aa6b3d203357b45e5eb1b",
        input: {
          image: imageUrl,
          upscale: 2,
          face_upsample: true,
          background_enhance: true,
          codeformer_fidelity: 0.95,
        },
      });

      const result = await client.wait(prediction);
      console.log("[FaceRestore] Tamamlandı:", result.id, result.status);

      return {
        jobId: result.id,
        status: this.mapJobStatus(result.status),
        imageUrl: this.extractImageUrl(result.output),
      };
    } catch (error: any) {
      console.error("[FaceRestore] Hata:", error?.message);
      return {
        jobId: "",
        status: "completed",
        imageUrl,
        error: "Face restore uygulanamadı, mevcut görsel kullanıldı",
      };
    }
  }

  /**
   * Tam post-processing pipeline: Padding → Face Swap → Remove Padding → CodeFormer
   * Orijinal görsel boyutunu korur, hiçbir şey kesilmez.
   */
  async postProcess(
    loraImageUrl: string,
    facePhotoUrl: string,
    userId?: number,
  ): Promise<string> {
    try {
      const { padToSquare, removePadding, uploadBuffer } = await import("./image-processing");

      // Adım 1: Orijinal görseli kare padding ile genişlet
      console.log("[PostProcess] Padding uygulanıyor...");
      const padResult = await padToSquare(loraImageUrl);
      const paddedUrl = await uploadBuffer(padResult.buffer, userId || 0, "temp");
      console.log("[PostProcess] Padded:", padResult.original.width, "x", padResult.original.height, "→", padResult.padded.width, "x", padResult.padded.height);

      // Adım 2: Face Swap (kare görsel üzerinde — kesme yok)
      const swapResult = await this.faceSwap(paddedUrl, facePhotoUrl);
      if (!swapResult.imageUrl) {
        console.log("[PostProcess] Face swap başarısız, orijinal kullanılacak");
        return loraImageUrl;
      }

      // Adım 3: Padding'i kaldır — orijinal boyuta dön
      console.log("[PostProcess] Padding kaldırılıyor...");
      const croppedBuffer = await removePadding(
        swapResult.imageUrl,
        padResult.original,
        padResult.paddingTop,
        padResult.paddingLeft,
      );
      const croppedUrl = await uploadBuffer(croppedBuffer, userId || 0, "temp");

      // Adım 4: CodeFormer — yüz netleştirme + upscale
      const restoreResult = await this.faceRestore(croppedUrl);
      return restoreResult.imageUrl || croppedUrl;
    } catch (error: any) {
      console.error("[PostProcess] Pipeline hatası:", error?.message);
      // Fallback: eski basit pipeline
      let currentUrl = loraImageUrl;
      const restoreResult = await this.faceRestore(currentUrl);
      if (restoreResult.imageUrl) currentUrl = restoreResult.imageUrl;
      const swapResult = await this.faceSwap(currentUrl, facePhotoUrl);
      if (swapResult.imageUrl) currentUrl = swapResult.imageUrl;
      return currentUrl;
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
        webhook: WEBHOOK_URL,
        webhook_events_filter: ["completed"],
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

  /**
   * Hızlı üretim — Flux yok, direkt Face Swap + CodeFormer.
   * Referans pozdaki yüzü kullanıcının yüzüyle değiştirir.
   * Senkron çalışır, ~10-15sn.
   */
  async generateQuick(
    referenceImageUrl: string,
    facePhotoUrl: string,
    userId?: number,
  ): Promise<JobResult> {
    try {
      console.log("[QuickGenerate] Hızlı üretim başlatılıyor (padding + face swap)");

      const { padToSquare, removePadding, uploadBuffer } = await import("./image-processing");

      // Adım 1: Referans görseli kare padding ile genişlet
      const padResult = await padToSquare(referenceImageUrl);
      const paddedUrl = await uploadBuffer(padResult.buffer, userId || 0, "temp");
      console.log("[QuickGenerate] Padded:", padResult.original.width, "x", padResult.original.height);

      // Adım 2: Face Swap (kare görsel — kesme yok)
      const swapResult = await this.faceSwap(paddedUrl, facePhotoUrl);
      console.log("[QuickGenerate] FaceSwap sonucu:", swapResult.status);

      if (!swapResult.imageUrl) {
        return { jobId: "", status: "failed", error: "Face swap başarısız" };
      }

      // Adım 3: Padding kaldır — orijinal boyuta dön
      const croppedBuffer = await removePadding(
        swapResult.imageUrl,
        padResult.original,
        padResult.paddingTop,
        padResult.paddingLeft,
      );
      const croppedUrl = await uploadBuffer(croppedBuffer, userId || 0, "temp");

      // Adım 4: CodeFormer
      const restoreResult = await this.faceRestore(croppedUrl);
      const finalUrl = restoreResult.imageUrl || croppedUrl;

      console.log("[QuickGenerate] Tamamlandı:", finalUrl.substring(0, 60));

      return {
        jobId: `quick-${Date.now()}`,
        status: "completed",
        imageUrl: finalUrl,
      };
    } catch (error: any) {
      console.error("[QuickGenerate] Hata:", error?.message);
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
        imageUrls: this.extractAllImageUrls(prediction.output),
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

  private extractAllImageUrls(output: unknown): string[] {
    if (Array.isArray(output)) {
      return output.filter((item): item is string => typeof item === "string");
    }
    if (typeof output === "string") {
      return [output];
    }
    return [];
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

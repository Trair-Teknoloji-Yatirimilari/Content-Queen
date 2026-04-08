import Replicate from "replicate";

interface ImageGenerationInput {
  prompt: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
}

interface ImageGenerationResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
}

class ReplicateService {
  private client: Replicate | null = null;

  constructor() {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (apiKey) {
      this.client = new Replicate({ auth: apiKey });
    }
  }

  /**
   * Görsel oluştur - Replicate API kullanarak
   * Flux Pro modeli kullanılıyor
   */
  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new Error("Replicate API anahtarı yapılandırılmadı");
    }

    try {
      // Flux Pro model ID
      const modelId = "black-forest-labs/flux-pro";

      const prediction = await this.client.predictions.create({
        model: modelId,
        input: {
          prompt: input.prompt,
          image: input.imageUrl,
          width: input.width || 1024,
          height: input.height || 1024,
          steps: input.steps || 50,
          guidance: input.guidance || 7.5,
          num_outputs: 1,
        },
      });

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: Array.isArray(prediction.output) ? prediction.output[0] : undefined,
      };
    } catch (error) {
      console.error("Görsel oluşturma hatası:", error);
      return {
        jobId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      };
    }
  }

  /**
   * Görsel oluşturma işinin durumunu kontrol et
   */
  async checkJobStatus(jobId: string): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new Error("Replicate API anahtarı yapılandırılmadı");
    }

    try {
      const prediction = await this.client.predictions.get(jobId);

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: Array.isArray(prediction.output) ? (prediction.output[0] as string) : undefined,
        error: prediction.error as string | undefined,
      };
    } catch (error) {
      console.error("İş durumu kontrol hatası:", error);
      return {
        jobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      };
    }
  }

  /**
   * Görsel işleme - Upscale, enhance vb.
   */
  async processImage(
    imageUrl: string,
    operation: "upscale" | "enhance" | "denoise"
  ): Promise<ImageGenerationResult> {
    if (!this.client) {
      throw new Error("Replicate API anahtarı yapılandırılmadı");
    }

    try {
      let modelId = "";

      switch (operation) {
        case "upscale":
          modelId = "nightmareai/real-esrgan";
          break;
        case "enhance":
          modelId = "tencentarc/gfpgan";
          break;
        case "denoise":
          modelId = "philz1337/clarity-upscaler";
          break;
      }

      const prediction = await this.client.predictions.create({
        model: modelId,
        input: {
          image: imageUrl,
        },
      });

      return {
        jobId: prediction.id,
        status: prediction.status as any,
        imageUrl: Array.isArray(prediction.output) ? prediction.output[0] : undefined,
      };
    } catch (error) {
      console.error("Görsel işleme hatası:", error);
      return {
        jobId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      };
    }
  }
}

export const replicateService = new ReplicateService();

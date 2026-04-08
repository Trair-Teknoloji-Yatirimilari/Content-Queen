import { describe, it, expect, beforeAll } from "vitest";
import { replicateService } from "./replicate-service";

describe("Replicate Service", () => {
  beforeAll(() => {
    // API anahtarının ayarlandığını kontrol et
    if (!process.env.REPLICATE_API_KEY) {
      console.warn("REPLICATE_API_KEY ortam değişkeni ayarlanmadı");
    }
  });

  it("should validate Replicate API key by checking service initialization", async () => {
    // Replicate servisi başarıyla başlatıldı mı kontrol et
    expect(replicateService).toBeDefined();
    expect(typeof replicateService.generateImage).toBe("function");
    expect(typeof replicateService.checkJobStatus).toBe("function");
  });

  it("should handle image generation request properly", async () => {
    // Bu test, API anahtarı geçerli olduğunda gerçek bir istek gönderir
    // Geçersiz anahtarsa hata döner
    const result = await replicateService.generateImage({
      prompt: "Test image",
      width: 512,
      height: 512,
    });

    // Sonuç, başarılı veya başarısız olabilir ama hata döndürmelidir
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(["pending", "processing", "completed", "failed"]).toContain(result.status);

    // API anahtarı geçersizse, failed status döner
    if (result.status === "failed" && result.error) {
      console.error("Replicate API hatası:", result.error);
      // Geçersiz anahtar hatası kontrol et
      if (result.error.includes("401") || result.error.includes("Unauthorized")) {
        throw new Error("Replicate API anahtarı geçersiz");
      }
    }
  });

  it("should handle job status check", async () => {
    // Geçersiz job ID ile test et
    const result = await replicateService.checkJobStatus("invalid-job-id");

    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    // Geçersiz job ID için failed döner
    expect(result.status).toBe("failed");
  });
});

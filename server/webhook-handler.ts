/**
 * Replicate Webhook Handler
 * 
 * Replicate, prediction veya training tamamlandığında bu endpoint'e POST atar.
 * Bu sayede polling'e gerek kalmaz — sonuç otomatik gelir.
 */
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { notifyImageComplete, notifyImageFailed, notifyTrainingComplete, notifyTrainingFailed } from "./push-service";
import { replicateService } from "./replicate-service";
import { persistImageFromUrl } from "./storage";

interface ReplicateWebhookBody {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string;
  version?: string;
  metrics?: { predict_time?: number };
}

function extractImageUrl(output: unknown): string | undefined {
  if (Array.isArray(output) && output.length > 0) return output[0] as string;
  if (typeof output === "string") return output;
  return undefined;
}

export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/replicate", async (req: Request, res: Response) => {
    try {
      // Webhook doğrulaması
      const ua = req.headers["user-agent"] || "";
      if (!ua.includes("Webhook") && !ua.includes("replicate") && !ua.includes("Replicate") && process.env.NODE_ENV === "production") {
        console.warn("[Webhook] Rejected: invalid user-agent:", ua);
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const body = req.body as ReplicateWebhookBody;
      console.log("[Webhook] Replicate:", body.id, body.status);

      if (!body.id || !body.status) {
        res.status(400).json({ error: "Invalid webhook payload" });
        return;
      }

      // ─── Görsel oluşturma sonucu ───
      const image = await db.getGeneratedImageByReplicateJobId(body.id);
      if (image) {
        const imageUrl = extractImageUrl(body.output);

        if (body.status === "succeeded" && imageUrl) {
          // Post-processing pipeline: Face Swap → Face Restore
          let finalImageUrl = imageUrl;
          try {
            const trainingPhotos = await db.getTrainingPhotos(image.userId);
            const facePhotos = await db.getUserReferencePhotos(image.userId, "face");
            const facePhoto = facePhotos[0] || trainingPhotos[0];

            if (facePhoto) {
              console.log("[Webhook] PostProcess başlatılıyor, image:", image.id);
              finalImageUrl = await replicateService.postProcess(imageUrl, facePhoto.photoUrl, image.userId);
              console.log("[Webhook] PostProcess tamamlandı:", image.id);
            }
          } catch (e) {
            console.error("[Webhook] PostProcess hata, orijinal kullanılacak:", e);
          }

          await db.updateGeneratedImage(image.id, {
            status: "completed" as any,
            generatedImageUrl: finalImageUrl,
          });
          console.log("[Webhook] Image completed:", image.id, finalImageUrl.substring(0, 60));

          // Görseli Supabase'e kalıcı kaydet (Replicate URL'leri geçici)
          persistImageFromUrl(finalImageUrl, image.userId, "generated").then(async (permanentUrl) => {
            if (permanentUrl !== finalImageUrl) {
              await db.updateGeneratedImage(image.id, { generatedImageUrl: permanentUrl } as any);
              console.log("[Webhook] Görsel kalıcı URL güncellendi:", image.id);
            }
          }).catch(() => {});

          // Push notification — sadece varyasyon grubunun ilki için gönder
          const isVariant = image.style?.includes("[");
          const isFirstVariant = !isVariant || image.style?.includes("[net]");
          if (isFirstVariant) {
            const pushToken = await db.getPushToken(image.userId);
            await notifyImageComplete(pushToken, image.userId, image.id, (image.style || "Profesyonel").replace(/\s*\[.*\]/, ""));
          }
        } else if (body.status === "failed" || body.status === "canceled") {
          await db.updateGeneratedImage(image.id, {
            status: "failed" as any,
          });
          console.log("[Webhook] Image failed:", image.id, body.error);

          const isFailedVariant = image.style?.includes("[");
          const isFirstFailedVariant = !isFailedVariant || image.style?.includes("[net]");
          if (isFirstFailedVariant) {
            const failToken = await db.getPushToken(image.userId);
            await notifyImageFailed(failToken, image.userId);
          }
        } else if (body.status === "processing") {
          await db.updateGeneratedImage(image.id, {
            status: "processing" as any,
          });
        }

        res.json({ ok: true, type: "image", id: image.id });
        return;
      }

      // ─── LoRA training sonucu ───
      // Training ID ile kullanıcıyı bul
      const dbConn = await db.getDb();
      if (dbConn) {
        const { eq } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema");
        const result = await dbConn
          .select()
          .from(users)
          .where(eq(users.loraTrainingId, body.id))
          .limit(1);

        if (result.length > 0) {
          const user = result[0];

          if (body.status === "succeeded") {
            const outputData = body.output as any;
            await db.updateUserLoRA(user.id, {
              loraStatus: "ready",
              loraModelVersion: outputData?.version ?? null,
              loraModelUrl: outputData?.weights ?? null,
              loraTrainedAt: new Date(),
            });
            console.log("[Webhook] Training completed for user:", user.id);

            const trainToken = await db.getPushToken(user.id);
            await notifyTrainingComplete(trainToken, user.id);
          } else if (body.status === "failed" || body.status === "canceled") {
            await db.updateUserLoRA(user.id, {
              loraStatus: "failed",
            });
            console.log("[Webhook] Training failed for user:", user.id, body.error);

            const failTrainToken = await db.getPushToken(user.id);
            await notifyTrainingFailed(failTrainToken, user.id);
          } else if (body.status === "processing") {
            await db.updateUserLoRA(user.id, {
              loraStatus: "training",
            });
          }

          res.json({ ok: true, type: "training", userId: user.id });
          return;
        }
      }

      // Bilinmeyen webhook — loglayıp 200 dön (Replicate retry yapmasın)
      console.log("[Webhook] Unknown prediction/training ID:", body.id);
      res.json({ ok: true, type: "unknown" });
    } catch (error) {
      console.error("[Webhook] Error:", error);
      // 200 dön ki Replicate retry yapmasın
      res.json({ ok: false, error: "Internal error" });
    }
  });
}

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { replicateService } from "./replicate-service";
import { storagePut } from "./storage";
import { notificationService } from "./notification-service";
import { sendOtp, verifyOtp, normalizePhone } from "./_core/otp";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "../shared/const.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    sendOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input }) => {
        return sendOtp(input.phone);
      }),

    verifyOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10), code: z.string().length(6) }))
      .mutation(async ({ ctx, input }) => {
        const result = await verifyOtp(input.phone, input.code);
        if (!result.success) {
          return result;
        }

        // Kullanıcıyı bul veya oluştur
        const phone = normalizePhone(input.phone);
        const userId = await db.upsertUserByPhone(phone);
        const user = await db.getUserByPhone(phone);

        if (!user) {
          return { success: false, error: "Kullanıcı oluşturulamadı" };
        }

        // Session token oluştur
        const sessionToken = await sdk.createSessionToken(phone, {
          name: user.name || phone,
          expiresInMs: ONE_YEAR_MS,
        });

        // Cookie set et (web için)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Yeni kullanıcıya ücretsiz deneme kredisi ver
        const existingCredits = await db.getUserCredits(user.id);
        if (!existingCredits) {
          await db.createUserCredits({
            userId: user.id,
            totalCredits: 3,
            usedCredits: 0,
            subscriptionTier: "free",
          });
        }

        return {
          success: true,
          sessionToken,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
          },
        };
      }),
  }),

  // ─── LoRA Training ───
  training: router({
    /** Kullanıcının LoRA durumunu getir */
    status: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return {
        loraStatus: user?.loraStatus ?? "none",
        loraModelVersion: user?.loraModelVersion ?? null,
        loraTrainedAt: user?.loraTrainedAt ?? null,
      };
    }),

    /** Training fotoğraflarını yükle */
    uploadPhoto: protectedProcedure
      .input(z.object({ base64: z.string(), fileName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const fileKey = `${ctx.user.id}/training/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, "image/jpeg");

        const photoId = await db.createReferencePhoto({
          userId: ctx.user.id,
          photoUrl: url,
          photoType: "training" as any,
          analysis: null,
        });

        return { id: photoId, photoUrl: url };
      }),

    /** Training fotoğraflarını listele */
    listPhotos: protectedProcedure.query(async ({ ctx }) => {
      return db.getTrainingPhotos(ctx.user.id);
    }),

    /** LoRA training başlat */
    start: protectedProcedure.mutation(async ({ ctx }) => {
      console.log("[Training] Start requested by user:", ctx.user.id);
      // Fotoğraf kontrolü
      const photos = await db.getTrainingPhotos(ctx.user.id);
      console.log("[Training] Found", photos.length, "training photos");
      if (photos.length < 5) {
        throw new Error("En az 5 eğitim fotoğrafı gerekli");
      }

      // Zaten training varsa engelle
      const user = await db.getUserById(ctx.user.id);
      if (user?.loraStatus === "training" || user?.loraStatus === "pending") {
        throw new Error("Zaten devam eden bir eğitim var");
      }

      // Fotoğrafları zip'le ve S3'e yükle
      const { default: archiver } = await import("archiver");
      const { PassThrough } = await import("stream");

      const passthrough = new PassThrough();
      const archive = archiver("zip", { zlib: { level: 5 } });
      const chunks: Buffer[] = [];

      passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.pipe(passthrough);

      // Her fotoğrafı indir ve zip'e ekle
      for (let i = 0; i < photos.length; i++) {
        const res = await fetch(photos[i].photoUrl);
        const arrayBuf = await res.arrayBuffer();
        archive.append(Buffer.from(arrayBuf), { name: `photo_${i}.jpg` });
      }

      await archive.finalize();
      await new Promise<void>((resolve) => passthrough.on("end", resolve));

      const zipBuffer = Buffer.concat(chunks);
      const zipKey = `${ctx.user.id}/training/training-photos.zip`;
      const { url: zipUrl } = await storagePut(zipKey, zipBuffer, "application/zip");

      // Replicate'te training başlat
      const destModel = `content-queen-user-${ctx.user.id}`;
      const result = await replicateService.trainLoRA(zipUrl, `trairx/${destModel}`);

      if (result.status === "failed") {
        throw new Error(result.error || "Training başlatılamadı");
      }

      // DB güncelle
      await db.updateUserLoRA(ctx.user.id, {
        loraStatus: "pending",
        loraTrainingId: result.trainingId,
      });

      return { trainingId: result.trainingId, status: "pending" };
    }),

    /** Training durumunu kontrol et ve güncelle */
    checkStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.loraTrainingId) {
        return { status: user?.loraStatus ?? "none" };
      }

      if (user.loraStatus === "ready" || user.loraStatus === "failed") {
        return {
          status: user.loraStatus,
          modelVersion: user.loraModelVersion,
        };
      }

      // Replicate'ten güncel durumu al
      const result = await replicateService.checkTrainingStatus(user.loraTrainingId);

      // DB güncelle
      if (result.status === "ready" && result.modelVersion) {
        await db.updateUserLoRA(ctx.user.id, {
          loraStatus: "ready",
          loraModelVersion: result.modelVersion,
          loraTrainedAt: new Date(),
        });
      } else if (result.status === "failed") {
        await db.updateUserLoRA(ctx.user.id, {
          loraStatus: "failed",
        });
      } else if (result.status === "training" && user.loraStatus !== "training") {
        await db.updateUserLoRA(ctx.user.id, { loraStatus: "training" });
      }

      return {
        status: result.status,
        modelVersion: result.modelVersion,
        error: result.error,
      };
    }),

    /** Training'i sıfırla (tekrar denemek için) */
    reset: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateUserLoRA(ctx.user.id, {
        loraStatus: "none",
        loraTrainingId: null,
        loraModelUrl: null,
        loraModelVersion: null,
        loraTrainedAt: null,
      });
      return { success: true };
    }),
  }),

  // ─── Content Queen Features ───
  credits: router({
    getCredits: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCredits(ctx.user.id);
    }),

    initializeCredits: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await db.getUserCredits(ctx.user.id);
      if (existing) return existing;

      return db.createUserCredits({
        userId: ctx.user.id,
        totalCredits: 1, // Ücretsiz deneme: 1 kredi
        usedCredits: 0,
        subscriptionTier: "free",
      });
    }),

    addCredits: protectedProcedure
      .input(z.object({ amount: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const credits = await db.getUserCredits(ctx.user.id);
        if (!credits) {
          return db.createUserCredits({
            userId: ctx.user.id,
            totalCredits: input.amount,
            usedCredits: 0,
            subscriptionTier: "pro",
          });
        }

        return db.updateUserCredits(ctx.user.id, {
          totalCredits: credits.totalCredits + input.amount,
        });
      }),
  }),

  referencePhotos: router({
    list: protectedProcedure
      .input(z.object({ photoType: z.enum(["face", "content", "training"]).optional() }))
      .query(async ({ ctx, input }) => {
        return db.getUserReferencePhotos(ctx.user.id, input.photoType);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          base64: z.string(),
          photoType: z.enum(["face", "content", "training"]),
          fileName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Base64'ı buffer'a çevir
          const buffer = Buffer.from(input.base64, "base64");

          // S3'e yükle
          const fileKey = `${ctx.user.id}/reference-photos/${input.photoType}-${Date.now()}.jpg`;
          const { url } = await storagePut(fileKey, buffer, "image/jpeg");

          // Veritabanına kaydet
          const photoId = await db.createReferencePhoto({
            userId: ctx.user.id,
            photoUrl: url,
            photoType: input.photoType as any,
            analysis: null,
          });

          return {
            id: photoId,
            photoUrl: url,
            photoType: input.photoType,
          };
        } catch (error) {
          console.error("Fotoğraf yükleme hatası:", error);
          throw new Error("Fotoğraf yüklenemedi");
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteReferencePhoto(input.id);
        return { success: true };
      }),
  }),

  generatedImages: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGeneratedImages(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          contentImageUrl: z.string(),
          faceImageUrl: z.string(),
          prompt: z.string(),
          style: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Kredi kontrolü
          const credits = await db.getUserCredits(ctx.user.id);
          if (!credits || credits.totalCredits - credits.usedCredits < 1) {
            throw new Error("Yeterli kredi yok");
          }

          // LoRA modeli var mı kontrol et
          const user = await db.getUserById(ctx.user.id);
          let result;

          if (user?.loraStatus === "ready" && user.loraModelVersion) {
            // LoRA ile üret (profesyonel mod)
            result = await replicateService.generateWithLoRA(
              user.loraModelVersion,
              input.contentImageUrl,
              input.prompt,
            );
          } else {
            // Standart Flux ile üret (fallback)
            result = await replicateService.generateStandard(
              input.prompt,
              input.contentImageUrl,
            );
          }

          if (result.status === "failed") {
            throw new Error(result.error || "Görsel oluşturulamadı");
          }

          // Veritabanına kaydet
          const imageId = await db.createGeneratedImage({
            userId: ctx.user.id,
            contentImageUrl: input.contentImageUrl,
            faceImageUrl: input.faceImageUrl,
            generatedImageUrl: result.imageUrl || "",
            prompt: input.prompt,
            style: input.style,
            replicateJobId: result.jobId,
            status: result.status as any,
            creditsUsed: 1,
          });

          // Kredi düş
          await db.deductCredits(ctx.user.id, 1);

          return {
            id: imageId,
            jobId: result.jobId,
            status: result.status,
            usedLoRA: !!(user?.loraStatus === "ready"),
          };
        } catch (error) {
          console.error("Görsel oluşturma hatası:", error);
          throw error;
        }
      }),

    checkStatus: protectedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ ctx, input }) => {
        const result = await replicateService.checkJobStatus(input.jobId);

        // Veritabanını güncelle
        const image = await db.getGeneratedImageByReplicateJobId(input.jobId);
        if (image && result.status !== image.status) {
          await db.updateGeneratedImage(image.id, {
            status: result.status as any,
            generatedImageUrl: result.imageUrl || image.generatedImageUrl,
          });

          // İşlem tamamlandığında bildirim gönder
          if (result.status === "completed") {
            await notificationService.notifyImageGenerated(
              ctx.user.id,
              image.id,
              image.style || "Profesyonel"
            );
          } else if (result.status === "failed") {
            await notificationService.notifyImageFailed(
              ctx.user.id,
              result.error || "Bilinmeyen hata"
            );
          }
        }

        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const image = await db.getGeneratedImage(input.id);
        if (!image || image.userId !== ctx.user.id) {
          throw new Error("Görsel bulunamadı");
        }
        return image;
      }),
  }),

  notifications: router({
    registerFCMToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return notificationService.saveFCMToken(ctx.user.id, input.token);
      }),
  }),
});

export type AppRouter = typeof appRouter;
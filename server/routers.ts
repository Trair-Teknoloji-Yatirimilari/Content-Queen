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

  // Content Queen Features
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
      .input(z.object({ photoType: z.enum(["face", "content"]).optional() }))
      .query(async ({ ctx, input }) => {
        return db.getUserReferencePhotos(ctx.user.id, input.photoType);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          base64: z.string(),
          photoType: z.enum(["face", "content"]),
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

          // Replicate API'ye gönder
          const result = await replicateService.generateImage({
            prompt: input.prompt,
            imageUrl: input.contentImageUrl,
            width: 1024,
            height: 1024,
            steps: 50,
            guidance: 7.5,
          });

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
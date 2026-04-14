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
import { notifyCreditsAdded } from "./push-service";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      // Tüm kullanıcı verilerini sil
      const dbConn = await db.getDb();
      if (dbConn) {
        const { eq } = await import("drizzle-orm");
        const schema = await import("../drizzle/schema");
        await dbConn.delete(schema.referencePhotos).where(eq(schema.referencePhotos.userId, userId));
        await dbConn.delete(schema.generatedImages).where(eq(schema.generatedImages.userId, userId));
        await dbConn.delete(schema.userCredits).where(eq(schema.userCredits.userId, userId));
        await dbConn.delete(schema.users).where(eq(schema.users.id, userId));
      }
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
      .input(z.object({
        phone: z.string().min(10),
        code: z.string().length(6),
        referralCode: z.string().optional(),
      }))
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

          // Referral kodu varsa uygula
          if (input.referralCode) {
            try {
              const referrer = await db.getUserByReferralCode(input.referralCode);
              if (referrer && referrer.id !== user.id) {
                await db.applyReferral(referrer.id, user.id, 3);
              }
            } catch (e) {
              console.error("[Referral] Error applying referral:", e);
            }
          }
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
      const credits = await db.getUserCredits(ctx.user.id);
      const tier = credits?.subscriptionTier ?? "free";
      const TRAIN_LIMITS: Record<string, number> = { free: 1, pro: 2, premium: 3 };
      const maxTrains = TRAIN_LIMITS[tier] ?? 1;

      let trainCount = user?.loraTrainCount ?? 0;
      const now = new Date();
      const resetAt = user?.loraTrainResetAt ? new Date(user.loraTrainResetAt) : null;
      if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        trainCount = 0;
      }

      return {
        loraStatus: user?.loraStatus ?? "none",
        loraModelVersion: user?.loraModelVersion ?? null,
        loraTrainedAt: user?.loraTrainedAt ?? null,
        trainingsUsed: trainCount,
        trainingsMax: maxTrains,
        trainingsRemaining: Math.max(0, maxTrains - trainCount),
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

      // Aylık training limit kontrolü
      const credits = await db.getUserCredits(ctx.user.id);
      const tier = credits?.subscriptionTier ?? "free";
      const TRAIN_LIMITS: Record<string, number> = { free: 1, pro: 2, premium: 3 };
      const maxTrains = TRAIN_LIMITS[tier] ?? 1;

      const user = await db.getUserById(ctx.user.id);
      if (user) {
        // Ay sıfırlama kontrolü
        const now = new Date();
        const resetAt = user.loraTrainResetAt ? new Date(user.loraTrainResetAt) : null;
        let trainCount = user.loraTrainCount ?? 0;

        if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
          // Yeni ay — sayacı sıfırla
          trainCount = 0;
          await db.updateUserLoRA(ctx.user.id, { loraTrainCount: 0, loraTrainResetAt: now } as any);
        }

        if (trainCount >= maxTrains) {
          throw new Error(`Bu ay ${maxTrains} model eğitim hakkınızı kullandınız. Planınızı yükselterek daha fazla eğitim yapabilirsiniz.`);
        }
      }

      // Fotoğraf kontrolü
      const photos = await db.getTrainingPhotos(ctx.user.id);
      console.log("[Training] Found", photos.length, "training photos");
      if (photos.length < 5) {
        throw new Error("En az 5 eğitim fotoğrafı gerekli");
      }

      // Zaten training varsa engelle
      if (user?.loraStatus === "training" || user?.loraStatus === "pending") {
        throw new Error("Zaten devam eden bir eğitim var");
      }

      // Fotoğrafları zip olarak paketle
      console.log("[Training] Packaging photos as zip...");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < photos.length; i++) {
        console.log(`[Training] Fetching photo ${i + 1}/${photos.length}`);
        const res = await fetch(photos[i].photoUrl);
        const buf = await res.arrayBuffer();
        zip.file(`photo_${i}.jpg`, buf);
      }

      const zipBuffer = Buffer.from(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
      console.log("[Training] Zip created:", zipBuffer.length, "bytes");

      const archiveKey = `${ctx.user.id}/training/training-photos.zip`;
      const { url: archiveUrl } = await storagePut(archiveKey, zipBuffer, "application/zip");
      console.log("[Training] Uploaded to:", archiveUrl);

      // Replicate'te training başlat
      const destModel = `content-queen-user-${ctx.user.id}`;
      const result = await replicateService.trainLoRA(archiveUrl, `trairx/${destModel}`);

      if (result.status === "failed") {
        throw new Error(result.error || "Training başlatılamadı");
      }

      // DB güncelle
      await db.updateUserLoRA(ctx.user.id, {
        loraStatus: "pending",
        loraTrainingId: result.trainingId,
      });

      // Training sayacını artır
      const newCount = (user?.loraTrainCount ?? 0) + 1;
      const dbConn = await db.getDb();
      if (dbConn) {
        const { eq } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema");
        await dbConn.update(users).set({
          loraTrainCount: newCount,
          loraTrainResetAt: new Date(),
        }).where(eq(users.id, ctx.user.id));
      }

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
          loraModelUrl: result.weightsUrl || null,
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
      .input(z.object({
        amount: z.number().min(1).max(150),
        subscriptionTier: z.enum(["free", "pro", "premium"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tier = input.subscriptionTier ?? (input.amount >= 999 ? "premium" : input.amount >= 35 ? "pro" : "free");
        const credits = await db.getUserCredits(ctx.user.id);
        let result;
        if (!credits) {
          result = await db.createUserCredits({
            userId: ctx.user.id,
            totalCredits: input.amount,
            usedCredits: 0,
            subscriptionTier: tier,
          });
        } else {
          result = await db.updateUserCredits(ctx.user.id, {
            totalCredits: credits.totalCredits + input.amount,
            subscriptionTier: tier === "free" ? credits.subscriptionTier : tier,
          });
        }

        // In-app + push notification
        notifyCreditsAdded(ctx.user.id, input.amount).catch(() => {});

        return result;
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

          // Boyut kontrolü — max 10MB
          if (buffer.length > 10 * 1024 * 1024) {
            throw new Error("Fotoğraf boyutu 10MB'dan büyük olamaz");
          }

          // Kullanıcı başına fotoğraf limiti — max 50
          const existingPhotos = await db.getUserReferencePhotos(ctx.user.id);
          if (existingPhotos.length >= 50) {
            throw new Error("Maksimum 50 fotoğraf yükleyebilirsiniz");
          }

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
          mode: z.enum(["auto", "quick", "lora"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Kredi kontrolü
          const credits = await db.getUserCredits(ctx.user.id);
          const requestMode = input.mode || "auto";
          const requiredCredits = requestMode === "lora" ? 5 : 1;
          if (!credits || credits.totalCredits - credits.usedCredits < requiredCredits) {
            throw new Error("Yeterli kredi yok");
          }

          // LoRA modeli hazır mı kontrol et
          const user = await db.getUserById(ctx.user.id);
          let result;
          let isQuickMode = false;

          const hasLoRA = user?.loraStatus === "ready" && user.loraModelVersion;

          if (requestMode === "lora" && hasLoRA) {
            result = await replicateService.generateWithLoRA(
              user!.loraModelVersion!,
              input.contentImageUrl,
              input.prompt,
              { loraWeightsUrl: user!.loraModelUrl || undefined },
            );
          } else if (requestMode === "quick" || !hasLoRA) {
            isQuickMode = true;
            // Kullanıcının yüz fotoğrafını al
            const facePhotos = await db.getUserReferencePhotos(ctx.user.id, "face");
            const trainingPhotos = await db.getTrainingPhotos(ctx.user.id);
            const facePhoto = facePhotos[0] || trainingPhotos[0];
            if (!facePhoto) {
              throw new Error("Yüz fotoğrafı bulunamadı. Lütfen önce selfie yükleyin.");
            }
            result = await replicateService.generateQuick(
              input.contentImageUrl,
              facePhoto.photoUrl,
            );
          } else {
            if (hasLoRA) {
              result = await replicateService.generateWithLoRA(
                user!.loraModelVersion!,
                input.contentImageUrl,
                input.prompt,
                { loraWeightsUrl: user!.loraModelUrl || undefined },
              );
            } else {
              isQuickMode = true;
              const facePhotos2 = await db.getUserReferencePhotos(ctx.user.id, "face");
              const trainingPhotos2 = await db.getTrainingPhotos(ctx.user.id);
              const facePhoto2 = facePhotos2[0] || trainingPhotos2[0];
              if (!facePhoto2) {
                throw new Error("Yüz fotoğrafı bulunamadı.");
              }
              result = await replicateService.generateQuick(
                input.contentImageUrl,
                facePhoto2.photoUrl,
              );
            }
          }

          if (result.status === "failed") {
            throw new Error(result.error || "Görsel oluşturulamadı");
          }

          // Varyant job ID'lerini al (sadece LoRA modunda var)
          const variantJobs = isQuickMode ? [] : ((result as any)._variantJobs || []);

          const imageIds: number[] = [];
          if (variantJobs.length > 0) {
            // LoRA modu — varyasyonlar
            for (let index = 0; index < variantJobs.length; index++) {
              const vJob = variantJobs[index];
              const imgId = await db.createGeneratedImage({
                userId: ctx.user.id,
                contentImageUrl: input.contentImageUrl,
                faceImageUrl: input.faceImageUrl,
                generatedImageUrl: "pending",
                prompt: input.prompt,
                style: `${input.style} [${vJob.variant}]`,
                replicateJobId: vJob.jobId,
                status: "pending" as any,
                creditsUsed: index === 0 ? 5 : 0,
              });
              imageIds.push(imgId);
            }
          } else {
            // Hızlı mod — senkron, direkt completed
            const imgId = await db.createGeneratedImage({
              userId: ctx.user.id,
              contentImageUrl: input.contentImageUrl,
              faceImageUrl: input.faceImageUrl,
              generatedImageUrl: result.imageUrl || "pending",
              prompt: input.prompt,
              style: isQuickMode ? "Hızlı Oluştur" : input.style,
              replicateJobId: result.jobId,
              status: (isQuickMode && result.status === "completed" ? "completed" : "pending") as any,
              creditsUsed: 1,
            });
            imageIds.push(imgId);
          }

          await db.deductCredits(ctx.user.id, isQuickMode ? 1 : 5);

          return {
            id: imageIds[0],
            jobId: result.jobId,
            variantJobIds: variantJobs.map((v: any) => v.jobId),
            variants: variantJobs.map((v: any) => ({
              jobId: v.jobId,
              variant: v.variant,
              loraScale: v.loraScale,
              promptStrength: v.promptStrength,
            })),
            status: result.status,
            imageUrl: result.imageUrl,
            isQuickMode,
            usedLoRA: !!(user?.loraStatus === "ready" && user.loraModelVersion),
          };
        } catch (error) {
          console.error("Görsel oluşturma hatası:", error);
          throw error;
        }
      }),

    checkStatus: protectedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ ctx, input }) => {
        // Önce DB'ye bak — webhook zaten güncellemiş olabilir
        const image = await db.getGeneratedImageByReplicateJobId(input.jobId);
        if (image && (image.status === "completed" || image.status === "failed")) {
          return {
            jobId: input.jobId,
            status: image.status,
            imageUrl: image.generatedImageUrl,
            imageUrls: image.generatedImageUrl ? [image.generatedImageUrl] : [],
            error: image.status === "failed" ? "Görsel oluşturulamadı" : undefined,
          };
        }

        // DB'de henüz tamamlanmamışsa Replicate'ten kontrol et
        const result = await replicateService.checkJobStatus(input.jobId);

        if (image && result.status !== image.status) {
          let finalImageUrl = result.imageUrl || image.generatedImageUrl;

          // LoRA görseli tamamlandıysa face swap uygula
          if (result.status === "completed" && result.imageUrl) {
            try {
              // Kullanıcının en iyi yüz fotoğrafını al (training fotoğraflarından ilki)
              const trainingPhotos = await db.getTrainingPhotos(ctx.user.id);
              const facePhotos = await db.getUserReferencePhotos(ctx.user.id, "face");
              const facePhoto = facePhotos[0] || trainingPhotos[0];

              if (facePhoto) {
                console.log("[FaceSwap] Uygulanıyor, image:", image.id);
                const swapResult = await replicateService.faceSwap(result.imageUrl, facePhoto.photoUrl);
                if (swapResult.imageUrl) {
                  finalImageUrl = swapResult.imageUrl;
                  console.log("[FaceSwap] Başarılı:", image.id);
                }
              }
            } catch (e) {
              console.error("[FaceSwap] Hata, orijinal görsel kullanılacak:", e);
            }
          }

          const dbStatus = result.status === "completed" ? "completed"
            : result.status === "failed" ? "failed"
            : result.status === "processing" ? "processing"
            : "pending";
          await db.updateGeneratedImage(image.id, {
            status: dbStatus as any,
            generatedImageUrl: finalImageUrl,
          });

          if (result.status === "completed") {
            // Bildirim webhook handler'dan gönderiliyor, burada tekrar gönderme
          } else if (result.status === "failed") {
            // Bildirim webhook handler'dan gönderiliyor
          }

          return {
            ...result,
            imageUrl: finalImageUrl,
          };
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const image = await db.getGeneratedImage(input.id);
        if (!image || image.userId !== ctx.user.id) {
          throw new Error("Görsel bulunamadı");
        }
        await db.deleteGeneratedImage(input.id);
        return { success: true };
      }),
  }),

  showcase: router({
    /** Showcase'deki görselleri listele (herkes görebilir) */
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return db.getShowcaseImages(input?.limit ?? 20);
      }),

    /** Stil bazlı showcase */
    byStyle: publicProcedure
      .input(z.object({ style: z.string(), limit: z.number().min(1).max(20).optional() }))
      .query(async ({ input }) => {
        return db.getShowcaseByStyle(input.style, input.limit ?? 10);
      }),

    /** Görseli showcase'e ekle */
    add: protectedProcedure
      .input(z.object({ generatedImageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const image = await db.getGeneratedImage(input.generatedImageId);
        if (!image || image.userId !== ctx.user.id) {
          throw new Error("Görsel bulunamadı");
        }
        if (image.status !== "completed") {
          throw new Error("Görsel henüz tamamlanmadı");
        }
        const alreadyShared = await db.isImageInShowcase(input.generatedImageId);
        if (alreadyShared) {
          throw new Error("Bu görsel zaten showcase'de");
        }
        const id = await db.addToShowcase({
          userId: ctx.user.id,
          generatedImageId: input.generatedImageId,
          imageUrl: image.generatedImageUrl,
          style: image.style,
        });
        return { id, success: true };
      }),

    /** Görseli showcase'den kaldır */
    remove: protectedProcedure
      .input(z.object({ generatedImageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromShowcase(input.generatedImageId, ctx.user.id);
        return { success: true };
      }),
  }),

  referral: router({
    /** Kullanıcının referral kodunu al (yoksa oluştur) */
    getCode: protectedProcedure.query(async ({ ctx }) => {
      const code = await db.ensureReferralCode(ctx.user.id);
      return { code, link: `https://contentqueen.com.tr/r/${code}` };
    }),

    /** Referral istatistikleri */
    stats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await db.getReferralStats(ctx.user.id);
      const code = await db.ensureReferralCode(ctx.user.id);
      return { ...stats, code, link: `https://contentqueen.com.tr/r/${code}` };
    }),
  }),

  notifications: router({
    registerPushToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.savePushToken(ctx.user.id, input.token);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input?.limit ?? 30);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await db.getUnreadCount(ctx.user.id) };
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllRead(ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
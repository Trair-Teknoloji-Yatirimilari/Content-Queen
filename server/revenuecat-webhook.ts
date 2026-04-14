/**
 * RevenueCat Webhook Handler
 * 
 * Gerçek satın alma doğrulaması — client-side addCredits yerine
 * RevenueCat sunucudan bildirim gönderir, biz krediyi ekleriz.
 */
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { notifyCreditsAdded } from "./push-service";

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || "";

// RevenueCat product ID → kredi miktarı
const PRODUCT_CREDITS: Record<string, number> = {
  credits_10: 10,
  credits_50: 50,
  credits_150: 150,
  sub_basic: 12,
  sub_pro: 35,
  sub_premium: 100,
};

const PRODUCT_TIERS: Record<string, "free" | "pro" | "premium"> = {
  sub_basic: "pro",
  sub_pro: "pro",
  sub_premium: "premium",
};

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  event_timestamp_ms: number;
  environment: "PRODUCTION" | "SANDBOX";
  store: string;
}

interface RevenueCatWebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

export function registerRevenueCatWebhook(app: Express) {
  app.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
    try {
      // Authorization header doğrulaması
      if (REVENUECAT_WEBHOOK_SECRET) {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
          console.warn("[RevenueCat] Unauthorized webhook attempt");
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const body = req.body as RevenueCatWebhookBody;
      const event = body.event;

      if (!event || !event.type) {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }

      console.log("[RevenueCat] Event:", event.type, "Product:", event.product_id, "User:", event.app_user_id);

      // Kullanıcıyı bul — app_user_id bizim user ID'miz
      const userId = parseInt(event.app_user_id);
      if (isNaN(userId)) {
        console.warn("[RevenueCat] Invalid user ID:", event.app_user_id);
        res.json({ ok: true });
        return;
      }

      const user = await db.getUserById(userId);
      if (!user) {
        console.warn("[RevenueCat] User not found:", userId);
        res.json({ ok: true });
        return;
      }

      switch (event.type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "NON_RENEWING_PURCHASE": {
          const creditAmount = PRODUCT_CREDITS[event.product_id];
          if (!creditAmount) {
            console.warn("[RevenueCat] Unknown product:", event.product_id);
            break;
          }

          const tier = PRODUCT_TIERS[event.product_id];
          const credits = await db.getUserCredits(userId);

          if (!credits) {
            await db.createUserCredits({
              userId,
              totalCredits: creditAmount,
              usedCredits: 0,
              subscriptionTier: tier || "free",
            });
          } else {
            await db.updateUserCredits(userId, {
              totalCredits: credits.totalCredits + creditAmount,
              ...(tier ? { subscriptionTier: tier } : {}),
            });
          }

          console.log("[RevenueCat] Credits added:", creditAmount, "to user:", userId);
          notifyCreditsAdded(userId, creditAmount).catch(() => {});
          break;
        }

        case "CANCELLATION":
        case "EXPIRATION": {
          // Abonelik iptal/sona erdi — tier'ı free'ye düşür
          const credits = await db.getUserCredits(userId);
          if (credits && credits.subscriptionTier !== "free") {
            await db.updateUserCredits(userId, { subscriptionTier: "free" });
            console.log("[RevenueCat] Subscription ended for user:", userId);
          }
          break;
        }

        default:
          console.log("[RevenueCat] Unhandled event type:", event.type);
      }

      // Hızlı yanıt ver — RevenueCat 60s timeout var
      res.json({ ok: true });
    } catch (error) {
      console.error("[RevenueCat] Webhook error:", error);
      res.json({ ok: false });
    }
  });
}

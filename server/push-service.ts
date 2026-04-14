/**
 * Expo Push Notification Service
 * Firebase yerine Expo'nun kendi push servisi — daha basit, daha güvenilir.
 */
import * as db from "./db";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendPushNotification(message: ExpoPushMessage): Promise<boolean> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(message),
    });

    const data = await res.json();
    if (data.data?.status === "ok") {
      console.log("[Push] Sent:", message.title, "→", message.to.substring(0, 30));
      return true;
    }

    console.warn("[Push] Failed:", data);
    return false;
  } catch (error) {
    console.error("[Push] Error:", error);
    return false;
  }
}

// ─── Public API ───

export async function notifyTrainingComplete(pushToken: string | null, userId: number): Promise<void> {
  const title = "AI Modelin Hazır! 🎉";
  const body = "Kişisel AI modelin başarıyla oluşturuldu. Artık profesyonel görseller üretebilirsin.";

  await db.createNotification({ userId, type: "training_ready", title, body, data: JSON.stringify({ type: "training_ready" }) });

  if (!pushToken) return;
  await sendPushNotification({ to: pushToken, title, body, data: { type: "training_ready", userId: String(userId) }, sound: "default" });
}

export async function notifyTrainingFailed(pushToken: string | null, userId: number): Promise<void> {
  const title = "Eğitim Başarısız 😔";
  const body = "AI model eğitimi tamamlanamadı. Lütfen tekrar deneyin.";

  await db.createNotification({ userId, type: "training_failed", title, body, data: JSON.stringify({ type: "training_failed" }) });

  if (!pushToken) return;
  await sendPushNotification({ to: pushToken, title, body, data: { type: "training_failed", userId: String(userId) }, sound: "default" });
}

export async function notifyImageComplete(pushToken: string | null, userId: number, imageId: number, style: string): Promise<void> {
  const title = "Görselin Hazır! ✨";
  const body = `${style} stilinde görselin başarıyla oluşturuldu.`;

  await db.createNotification({ userId, type: "image_generated", title, body, data: JSON.stringify({ type: "image_generated", imageId: String(imageId) }) });

  if (!pushToken) return;
  await sendPushNotification({ to: pushToken, title, body, data: { type: "image_generated", imageId: String(imageId), userId: String(userId) }, sound: "default" });
}

export async function notifyImageFailed(pushToken: string | null, userId: number): Promise<void> {
  const title = "Görsel Oluşturulamadı";
  const body = "Bir sorun oluştu. Lütfen tekrar deneyin.";

  await db.createNotification({ userId, type: "image_failed", title, body, data: JSON.stringify({ type: "image_failed" }) });

  if (!pushToken) return;
  await sendPushNotification({ to: pushToken, title, body, data: { type: "image_failed", userId: String(userId) }, sound: "default" });
}

export async function notifyCreditsAdded(userId: number, amount: number): Promise<void> {
  const title = "Kredi Yüklendi! 💎";
  const body = `${amount} kredi hesabınıza eklendi.`;

  await db.createNotification({ userId, type: "credits_added", title, body, data: JSON.stringify({ type: "credits_added", amount: String(amount) }) });

  const pushToken = await db.getPushToken(userId);
  if (!pushToken) return;
  await sendPushNotification({ to: pushToken, title, body, data: { type: "credits_added" }, sound: "default" });
}

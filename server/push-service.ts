/**
 * Expo Push Notification Service
 * Firebase yerine Expo'nun kendi push servisi — daha basit, daha güvenilir.
 */

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
  if (!pushToken) return;

  await sendPushNotification({
    to: pushToken,
    title: "AI Modelin Hazır! 🎉",
    body: "Kişisel AI modelin başarıyla oluşturuldu. Artık profesyonel görseller üretebilirsin.",
    data: { type: "training_ready", userId: String(userId) },
    sound: "default",
  });
}

export async function notifyTrainingFailed(pushToken: string | null, userId: number): Promise<void> {
  if (!pushToken) return;

  await sendPushNotification({
    to: pushToken,
    title: "Eğitim Başarısız 😔",
    body: "AI model eğitimi tamamlanamadı. Lütfen tekrar deneyin.",
    data: { type: "training_failed", userId: String(userId) },
    sound: "default",
  });
}

export async function notifyImageComplete(pushToken: string | null, userId: number, imageId: number, style: string): Promise<void> {
  if (!pushToken) return;

  await sendPushNotification({
    to: pushToken,
    title: "Görselin Hazır! ✨",
    body: `${style} stilinde görselin başarıyla oluşturuldu.`,
    data: { type: "image_generated", imageId: String(imageId), userId: String(userId) },
    sound: "default",
  });
}

export async function notifyImageFailed(pushToken: string | null, userId: number): Promise<void> {
  if (!pushToken) return;

  await sendPushNotification({
    to: pushToken,
    title: "Görsel Oluşturulamadı",
    body: "Bir sorun oluştu. Lütfen tekrar deneyin.",
    data: { type: "image_failed", userId: String(userId) },
    sound: "default",
  });
}

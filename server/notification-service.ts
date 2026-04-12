import * as admin from "firebase-admin";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class NotificationService {
  private initialized = false;

  constructor() {
    // Firebase Admin SDK'yı başlat — sadece GOOGLE_APPLICATION_CREDENTIALS varsa
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
        admin.initializeApp();
        this.initialized = true;
      } else {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          console.log("[Notification] Firebase atlandı: GOOGLE_APPLICATION_CREDENTIALS tanımlı değil");
        }
        this.initialized = false;
      }
    } catch (error) {
      console.warn("Firebase Admin SDK başlatılamadı:", error);
      this.initialized = false;
    }
  }

  /**
   * Belirli bir kullanıcıya push bildirim gönder
   */
  async sendToUser(userId: number, payload: NotificationPayload): Promise<boolean> {
    if (!this.initialized) {
      console.warn("Bildirim servisi başlatılmadı");
      return false;
    }

    try {
      // Kullanıcının FCM token'ını veritabanından al
      // (Bu, kullanıcı cihazını kaydettiğinde kaydedilecek)
      const fcmToken = await this.getUserFCMToken(userId);
      if (!fcmToken) {
        console.warn(`Kullanıcı ${userId} için FCM token bulunamadı`);
        return false;
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log("Bildirim gönderildi:", response);
      return true;
    } catch (error) {
      console.error("Bildirim gönderme hatası:", error);
      return false;
    }
  }

  /**
   * Görsel oluşturma tamamlandığında bildirim gönder
   */
  async notifyImageGenerated(
    userId: number,
    imageId: number,
    style: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "Görseliniz Hazır! 🎉",
      body: `${style} stilinde görseliniz başarıyla oluşturuldu.`,
      data: {
        type: "image_generated",
        imageId: imageId.toString(),
        action: "open_image",
      },
    });
  }

  /**
   * Görsel oluşturma başarısız olduğunda bildirim gönder
   */
  async notifyImageFailed(userId: number, error: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "Görsel Oluşturulamadı",
      body: `İşlem başarısız oldu: ${error}`,
      data: {
        type: "image_failed",
        action: "retry",
      },
    });
  }

  /**
   * Kullanıcının FCM token'ını kaydet
   */
  async saveFCMToken(userId: number, token: string): Promise<boolean> {
    try {
      // Bu, users tablosuna fcmToken sütunu eklendiğinde kullanılacak
      // Şimdilik placeholder
      console.log(`FCM Token kaydedildi - Kullanıcı: ${userId}, Token: ${token}`);
      return true;
    } catch (error) {
      console.error("FCM token kaydetme hatası:", error);
      return false;
    }
  }

  /**
   * Kullanıcının FCM token'ını al
   */
  private async getUserFCMToken(userId: number): Promise<string | null> {
    try {
      // Bu, users tablosundan fcmToken sütununu okuyacak
      // Şimdilik placeholder
      return null;
    } catch (error) {
      console.error("FCM token alma hatası:", error);
      return null;
    }
  }

  /**
   * Toplu bildirim gönder (tüm kullanıcılara)
   */
  async sendToAll(payload: NotificationPayload): Promise<number> {
    if (!this.initialized) {
      console.warn("Bildirim servisi başlatılmadı");
      return 0;
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        topic: "all_users",
      };

      const response = await admin.messaging().send(message);
      console.log("Toplu bildirim gönderildi:", response);
      return 1;
    } catch (error) {
      console.error("Toplu bildirim gönderme hatası:", error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();

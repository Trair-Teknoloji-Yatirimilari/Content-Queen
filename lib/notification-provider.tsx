import React, { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { trpc } from "./trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Bildirim handler'ı yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // Kullanıcı bildirimleri kapattıysa gösterme
    const enabled = await AsyncStorage.getItem("content_queen_notifications");
    if (enabled === "false") {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const registerFCMTokenMutation = trpc.notifications.registerFCMToken.useMutation();

  useEffect(() => {
    // FCM token'ını al ve kaydet
    registerPushNotifications();

    // Bildirim alındığında listener
    const notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Bildirim alındı:", notification);
      }
    );

    // Bildirime tıklandığında listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Bildirime tıklandı:", response);

        const data = response.notification.request.content.data;

        // Bildirim türüne göre yönlendir
        if (data?.type === "image_generated" && data?.imageId) {
          router.push({
            pathname: "/(tabs)",
          });
        } else if (data?.type === "image_failed") {
          router.push("/generate-image");
        }
      }
    );

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, [registerFCMTokenMutation, router]);

  const registerPushNotifications = async () => {
    try {
      // Bildirim izni iste
      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== "granted") {
        console.warn("Bildirim izni verilmedi");
        return;
      }

      // Expo Push Token'ı al
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("Expo Push Token:", token.data);

        // Token'ı backend'e kaydet
        if (token.data) {
          await registerFCMTokenMutation.mutateAsync({
            token: token.data,
          });
        }
      } catch (tokenError) {
        console.warn("Push token alınamadı (web/emulator'de normal):", tokenError);
      }
    } catch (error) {
      console.error("Push bildirim kaydı hatası:", error);
    }
  };

  return <>{children}</>;
}

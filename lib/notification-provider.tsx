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
  const registerPushTokenMutation = trpc.notifications.registerPushToken.useMutation();

  useEffect(() => {
    registerPushNotifications();

    const notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Bildirim alındı:", notification);
      }
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Bildirime tıklandı:", response);
        const data = response.notification.request.content.data;

        if (data?.type === "image_generated" && data?.imageId) {
          router.push({ pathname: "/(tabs)" as any });
        } else if (data?.type === "training_ready") {
          router.push("/training");
        }
      }
    );

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, [registerPushTokenMutation, router]);

  const registerPushNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Bildirim izni verilmedi");
        return;
      }

      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("Expo Push Token:", token.data);

        if (token.data) {
          await registerPushTokenMutation.mutateAsync({ token: token.data });
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

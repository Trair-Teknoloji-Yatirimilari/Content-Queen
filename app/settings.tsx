import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useI18n, type Language } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingItem({ label, value, onPress, rightElement }: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? "#F0F0F0" : "transparent",
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
      ]}
    >
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {value && <Text className="text-sm text-muted mt-1">{value}</Text>}
      </View>
      {rightElement}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const { signOut, user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notif = await AsyncStorage.getItem("content_queen_notifications");
      const email = await AsyncStorage.getItem("content_queen_email_notifications");

      if (notif !== null) setNotificationsEnabled(notif === "true");
      if (email !== null) setEmailNotifications(email === "true");
    } catch (error) {
      console.error("Ayarlar yükleme hatası:", error);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem("content_queen_notifications", String(value));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEmailNotificationsToggle = async (value: boolean) => {
    setEmailNotifications(value);
    await AsyncStorage.setItem("content_queen_email_notifications", String(value));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLanguageChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t("splash.selectLanguage"),
      "Dili değiştirmek istediğinizden emin misiniz?",
      [
        {
          text: "İptal",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Türkçe",
          onPress: () => setLanguage("tr"),
        },
        {
          text: "English",
          onPress: () => setLanguage("en"),
        },
      ]
    );
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Çıkış Yap",
      "Oturumunuzu kapatmak istediğinizden emin misiniz?",
      [
        {
          text: "İptal",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Çıkış Yap",
          onPress: async () => {
            await signOut();
            router.replace("/login");
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Hesabı Sil",
      "Bu işlem geri alınamaz. Tüm verileriniz silinecektir.",
      [
        {
          text: "İptal",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Sil",
          onPress: () => {
            Alert.alert(
              "Hesap Silindi",
              "Hesabınız başarıyla silinmiştir.",
              [
                {
                  text: "Tamam",
                  onPress: async () => {
                    await signOut();
                    router.replace("/login");
                  },
                },
              ]
            );
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Ayarlar</Text>
            <Text className="text-sm text-muted">
              Uygulama tercihlerinizi yönetin
            </Text>
          </View>

          {/* Dil Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              DİL
            </Text>
            <SettingItem
              label="Dil"
              value={language === "tr" ? "Türkçe" : "English"}
              onPress={handleLanguageChange}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
          </View>

          {/* Bildirim Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              BİLDİRİMLER
            </Text>
            <SettingItem
              label="Push Bildirimleri"
              value="Görsel oluşturma tamamlandığında bildir"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationsToggle}
                  trackColor={{ false: "#E5E7EB", true: "#E94B8F" }}
                  thumbColor={notificationsEnabled ? "#E94B8F" : "#9BA1A6"}
                />
              }
            />
            <View className="h-px bg-border" />
            <SettingItem
              label="E-posta Bildirimleri"
              value="Haftalık özet ve öneriler"
              rightElement={
                <Switch
                  value={emailNotifications}
                  onValueChange={handleEmailNotificationsToggle}
                  trackColor={{ false: "#E5E7EB", true: "#E94B8F" }}
                  thumbColor={emailNotifications ? "#E94B8F" : "#9BA1A6"}
                />
              }
            />
          </View>

          {/* Hesap Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              HESAP
            </Text>
            <SettingItem
              label="E-posta"
              value={user?.email || "Yükleniyor..."}
            />
            <View className="h-px bg-border" />
            <SettingItem
              label="Üyelik Tarihi"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "-"}
            />
          </View>

          {/* Hakkında */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              HAKKINDA
            </Text>
            <SettingItem
              label="Sürüm"
              value="1.0.0"
            />
            <View className="h-px bg-border" />
            <SettingItem
              label="Gizlilik Politikası"
              onPress={() => {
                // TODO: Gizlilik politikası linkini aç
              }}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
            <View className="h-px bg-border" />
            <SettingItem
              label="Kullanım Şartları"
              onPress={() => {
                // TODO: Kullanım şartları linkini aç
              }}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
          </View>

          {/* Tehlikeli İşlemler */}
          <View className="gap-3 mb-6">
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-base">
                Çıkış Yap
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#FEE2E2" : "#FEF2F2",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-error font-semibold text-base">
                Hesabı Sil
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

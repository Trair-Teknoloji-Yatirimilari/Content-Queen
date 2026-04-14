import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useI18n, type Language } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeContext } from "@/lib/theme-provider";
import { PALETTE_LABELS, type ColorScheme, type ThemePalette } from "@/constants/theme";

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
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { colorScheme, setColorScheme, palette, setPalette } = useThemeContext();
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notif = await AsyncStorage.getItem("content_queen_notifications");
      if (notif !== null) setNotificationsEnabled(notif === "true");
      const theme = await AsyncStorage.getItem("content_queen_theme");
      if (theme) setThemeMode(theme as "auto" | "light" | "dark");
    } catch (error) {
      console.error("Ayarlar yükleme hatası:", error);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem("content_queen_notifications", String(value));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLanguageChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t("splash.selectLanguage"),
      "Dili değiştirmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { text: "Türkçe", onPress: () => setLanguage("tr") },
        { text: "English", onPress: () => setLanguage("en") },
      ]
    );
  };

  const handleThemeChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Tema Seçin",
      undefined,
      [
        {
          text: "Otomatik (Sistem)",
          onPress: async () => {
            setThemeMode("auto");
            await AsyncStorage.setItem("content_queen_theme", "auto");
            const { Appearance } = require("react-native");
            const sys = Appearance.getColorScheme() || "light";
            setColorScheme(sys);
          },
        },
        {
          text: "☀️ Açık",
          onPress: async () => {
            setThemeMode("light");
            await AsyncStorage.setItem("content_queen_theme", "light");
            setColorScheme("light");
          },
        },
        {
          text: "🌙 Koyu",
          onPress: async () => {
            setThemeMode("dark");
            await AsyncStorage.setItem("content_queen_theme", "dark");
            setColorScheme("dark");
          },
        },
        { text: "İptal", style: "cancel" },
      ]
    );
  };

  const handlePaletteChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Renk Paleti",
      undefined,
      [
        { text: "💖 Klasik Pembe", onPress: () => setPalette("classic") },
        { text: "👑 Gold", onPress: () => setPalette("rosegold") },
        { text: "🍇 Lavanta", onPress: () => setPalette("lavender") },
        { text: "🍑 Şeftali", onPress: () => setPalette("peach") },
        { text: "İptal", style: "cancel" },
      ]
    );
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("settings.logout"),
      t("settings.logoutConfirm"),
      [
        {
          text: t("common.cancel"),
          onPress: () => {},
          style: "cancel",
        },
        {
          text: t("settings.logout"),
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
      t("settings.deleteAccount"),
      t("settings.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Hesabımı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync();
              await signOut();
              router.replace("/login");
            } catch {
              Alert.alert("Hata", "Hesap silinemedi. Tekrar deneyin.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScreenHeader title={t("settings.title")} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">

          {/* Dil Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              {t("settings.language")}
            </Text>
            <SettingItem
              label={t("settings.languageLabel")}
              value={language === "tr" ? "Türkçe" : "English"}
              onPress={handleLanguageChange}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
          </View>

          {/* Tema Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              Görünüm
            </Text>
            <SettingItem
              label="Renk Paleti"
              value={palette === "classic" ? "💖 Klasik Pembe" : palette === "rosegold" ? "👑 Gold" : palette === "lavender" ? "🍇 Lavanta" : "🍑 Şeftali"}
              onPress={handlePaletteChange}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
            <View className="h-px bg-border" />
            <SettingItem
              label="Tema"
              value={themeMode === "auto" ? "Otomatik (Sistem)" : themeMode === "light" ? "☀️ Açık" : "🌙 Koyu"}
              onPress={handleThemeChange}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
          </View>

          {/* Bildirim Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              {t("settings.notifications")}
            </Text>
            <SettingItem
              label={t("settings.pushNotif")}
              value={t("settings.pushNotifDesc")}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationsToggle}
                  trackColor={{ false: "#E5E7EB", true: "#E94B8F" }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </View>

          {/* Hesap Ayarları */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              {t("settings.account")}
            </Text>
            <SettingItem
              label={t("settings.phone")}
              value={user?.phone || "-"}
            />
          </View>

          {/* Hakkında */}
          <View className="bg-surface rounded-lg border border-border overflow-hidden">
            <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
              {t("settings.about")}
            </Text>
            <SettingItem
              label={t("settings.version")}
              value="1.0.0"
            />
            <View className="h-px bg-border" />
            <SettingItem
              label={t("settings.privacy")}
              onPress={() => router.push("/privacy-policy")}
              rightElement={
                <Text className="text-sm text-primary font-medium">›</Text>
              }
            />
            <View className="h-px bg-border" />
            <SettingItem
              label={t("settings.terms")}
              onPress={() => router.push("/terms-of-service")}
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
                {t("settings.logout")}
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
                {t("settings.deleteAccount")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

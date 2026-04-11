import React from "react";
import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Cikis Yap", "Cikis yapmak istediginizden emin misiniz?", [
      { text: "Iptal", onPress: () => {} },
      {
        text: "Cikis Yap",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (error) {
            Alert.alert("Hata", "Cikis yapilirken hata olustu");
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="bg-background">
      <ScreenHeader title="Profilim" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4 gap-6">

          {/* User Info Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="gap-2">
              <Text className="text-xs text-muted uppercase">Ad</Text>
              <Text className="text-lg font-semibold text-foreground">{user?.name || "Kullanıcı"}</Text>
            </View>
            <View className="gap-2">
              <Text className="text-xs text-muted uppercase">Telefon</Text>
              <Text className="text-lg font-semibold text-foreground">{user?.phone || "-"}</Text>
            </View>
          </View>

          {/* Subscription Info */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <Text className="text-lg font-semibold text-foreground">Abonelik Bilgileri</Text>
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Paket</Text>
                <Text className="text-sm font-semibold text-primary">Premium</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Kalan Kredi</Text>
                <Text className="text-sm font-semibold text-foreground">5 / 10</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Yenileme Tarihi</Text>
                <Text className="text-sm font-semibold text-foreground">5 Mayis 2026</Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <Text className="text-lg font-semibold text-foreground">Istatistikler</Text>
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Olusturulan Gorsel</Text>
                <Text className="text-sm font-semibold text-foreground">12</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Kaydedilen Referans</Text>
                <Text className="text-sm font-semibold text-foreground">3</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Toplam Kullanim</Text>
                <Text className="text-sm font-semibold text-foreground">5 saat</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View className="gap-2">
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-sm">Ayarlar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-sm">Gizlilik Politikasi</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-sm">Hizmet Sartlari</Text>
            </Pressable>
          </View>

          {/* Sign Out Button */}
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? "#FF5252" : "#FF3B30",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text className="text-white font-semibold text-base">Cikis Yap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

import React from "react";
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuth();

  const creditsQuery = trpc.credits.getCredits.useQuery();
  const imagesQuery = trpc.generatedImages.list.useQuery();
  const trainingQuery = trpc.training.status.useQuery();
  const photosQuery = trpc.training.listPhotos.useQuery();

  const credits = creditsQuery.data;
  const images = imagesQuery.data ?? [];
  const loraStatus = trainingQuery.data?.loraStatus ?? "none";
  const trainingPhotos = photosQuery.data ?? [];

  const remainingCredit = credits ? credits.totalCredits - credits.usedCredits : 0;
  const tierLabels: Record<string, string> = { free: "Ücretsiz", pro: "Pro", premium: "Premium" };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinize emin misiniz?", [
      { text: "İptal" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const isLoading = creditsQuery.isLoading;

  return (
    <ScreenContainer>
      <ScreenHeader title="Profilim" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 8 }}>

          {/* User Card */}
          <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>
                  {user?.name || "Kullanıcı"}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  {user?.phone || "-"}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            {!isLoading && (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{remainingCredit}</Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Kredi</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{images.length}</Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Görsel</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>
                    {loraStatus === "ready" ? "✓" : loraStatus === "training" ? "⏳" : "—"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>AI Model</Text>
                </View>
              </View>
            )}
            {isLoading && <ActivityIndicator color="#fff" />}
          </View>

          {/* Subscription */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, gap: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>Abonelik</Text>
            <Row label="Paket" value={tierLabels[credits?.subscriptionTier ?? "free"] ?? "Ücretsiz"} colors={colors} highlight />
            <Row label="Toplam Kredi" value={`${credits?.totalCredits ?? 0}`} colors={colors} />
            <Row label="Kullanılan" value={`${credits?.usedCredits ?? 0}`} colors={colors} />
            <Row label="Kalan" value={`${remainingCredit}`} colors={colors} />
          </View>

          {/* AI Model */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, gap: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>AI Model</Text>
            <Row label="Durum" value={
              loraStatus === "ready" ? "Hazır ✅" :
              loraStatus === "training" ? "Eğitiliyor ⏳" :
              loraStatus === "pending" ? "Sırada ⏳" : "Oluşturulmadı"
            } colors={colors} />
            <Row label="Eğitim Fotoğrafı" value={`${trainingPhotos.length} adet`} colors={colors} />
            {trainingQuery.data?.loraTrainedAt && (
              <Row label="Eğitim Tarihi" value={new Date(trainingQuery.data.loraTrainedAt).toLocaleDateString("tr-TR")} colors={colors} />
            )}
            <Pressable
              onPress={() => router.push("/training")}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 4,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>
                {loraStatus === "ready" ? "Modeli Güncelle" : "AI Model Oluştur"}
              </Text>
            </Pressable>
          </View>

          {/* Links */}
          <View style={{ gap: 8 }}>
            <LinkButton label="Ayarlar" onPress={() => router.push("/settings")} colors={colors} />
            <LinkButton label="Gizlilik Politikası" onPress={() => router.push("/privacy-policy")} colors={colors} />
            <LinkButton label="Kullanım Şartları" onPress={() => router.push("/terms-of-service")} colors={colors} />
          </View>

          {/* Sign Out */}
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#FF5252" : colors.error,
              paddingVertical: 14, borderRadius: 14, alignItems: "center",
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Çıkış Yap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, colors, highlight }: { label: string; value: string; colors: any; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: highlight ? colors.primary : colors.foreground }}>{value}</Text>
    </View>
  );
}

function LinkButton({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16,
        borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.muted }}>›</Text>
    </Pressable>
  );
}

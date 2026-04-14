import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const creditsQuery = trpc.credits.getCredits.useQuery();
  const imagesQuery = trpc.generatedImages.list.useQuery();
  const trainingQuery = trpc.training.status.useQuery();

  const credits = creditsQuery.data;
  const recentImages = imagesQuery.data ?? [];
  const loraStatus = trainingQuery.data?.loraStatus ?? "none";
  const isLoading = creditsQuery.isLoading || imagesQuery.isLoading;

  const remainingCredit = credits
    ? credits.totalCredits - credits.usedCredits
    : 0;
  const subscriptionTier = credits?.subscriptionTier ?? "free";

  const tierLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    premium: "Premium",
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([creditsQuery.refetch(), imagesQuery.refetch(), trainingQuery.refetch()]);
    setRefreshing(false);
  }, [creditsQuery, imagesQuery, trainingQuery]);

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (loraStatus === "ready") {
      router.push("/content-reference");
    } else {
      router.push("/training");
    }
  };

  const handleManageReferences = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/reference-photos");
  };

  const handleImagePress = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/image-detail?id=${id}`);
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 48,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>
                Content Queen
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                Kraliçe gibi parla ✨
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 18, color: "#fff" }}>👤</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Credit Card (overlapping header) ── */}
        <View style={{ paddingHorizontal: 20, marginTop: -32 }}>
          <Pressable
            onPress={() => router.push("/pricing")}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 6,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Kalan Kredi
                  </Text>
                  <Text style={{ fontSize: 32, fontWeight: "800", color: colors.primary, marginTop: 6 }}>
                    {remainingCredit}
                  </Text>
                </View>
                <View style={{ height: 40, width: 1, backgroundColor: colors.border, marginTop: 4 }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Plan
                  </Text>
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: subscriptionTier === "free" ? colors.border : colors.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: subscriptionTier === "free" ? colors.foreground : "#fff",
                      }}
                    >
                      {tierLabels[subscriptionTier] ?? subscriptionTier}
                    </Text>
                  </View>
                </View>
                <View style={{ height: 40, width: 1, backgroundColor: colors.border, marginTop: 4 }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Oluşturulan
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, marginTop: 6 }}>
                    {recentImages.length}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20, flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/training");
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: loraStatus === "ready" ? "rgba(52,199,89,0.08)" : colors.surface,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              borderWidth: loraStatus === "ready" ? 1 : 0,
              borderColor: loraStatus === "ready" ? "rgba(52,199,89,0.3)" : "transparent",
            })}
          >
            <Text style={{ fontSize: 24 }}>
              {loraStatus === "ready" ? "✅" : loraStatus === "training" || loraStatus === "pending" ? "⏳" : "🧠"}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
              AI Modelim
            </Text>
          </Pressable>

          <Pressable
            onPress={handleManageReferences}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontSize: 24 }}>📸</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
              Referanslarım
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontSize: 24 }}>⚙️</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
              Ayarlar
            </Text>
          </Pressable>
        </View>

        {/* ── Recent Images ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              Son Görseller
            </Text>
            {recentImages.length > 6 && (
              <Pressable onPress={() => router.push("/gallery")}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                  Tümünü Gör
                </Text>
              </Pressable>
            )}
          </View>

          {isLoading && (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {!isLoading && recentImages.length === 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingVertical: 48,
                paddingHorizontal: 32,
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "rgba(233,75,143,0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 32 }}>✨</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                Henüz Görsel Yok
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
                İlk görselini oluştur ve{"\n"}kraliçe gibi parlamaya başla
              </Text>
              <Pressable
                onPress={handleCreateNew}
                style={({ pressed }) => ({
                  marginTop: 8,
                  backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                  borderRadius: 12,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
                  Hadi Başlayalım
                </Text>
              </Pressable>
            </View>
          )}

          {!isLoading && recentImages.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {recentImages.slice(0, 6).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleImagePress(item.id)}
                  style={({ pressed }) => ({
                    width: "31%",
                    aspectRatio: 1,
                    borderRadius: 14,
                    overflow: "hidden",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  <Image
                    source={{ uri: item.generatedImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                  />
                  {(item.status === "pending" || item.status === "processing") && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 14,
                      }}
                    >
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                        İşleniyor
                      </Text>
                    </View>
                  )}
                  {item.status === "failed" && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(255,59,48,0.85)",
                        paddingVertical: 4,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#fff", fontWeight: "600" }}>
                        Başarısız
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── CTA Button ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Pressable
            onPress={handleCreateNew}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#D93B7F" : colors.primary,
              paddingVertical: 18,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 8,
            })}
          >
            <Text style={{ fontSize: 22 }}>{loraStatus === "ready" ? "✦" : "🧠"}</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              {loraStatus === "ready"
                ? "Yeni Görsel Oluştur"
                : loraStatus === "training" || loraStatus === "pending"
                  ? "Eğitim Devam Ediyor..."
                  : "AI Modelini Oluştur"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

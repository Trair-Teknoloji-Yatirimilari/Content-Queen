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
import { useCallback, useState, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const creditsQuery = trpc.credits.getCredits.useQuery();
  const imagesQuery = trpc.generatedImages.list.useQuery();
  const trainingQuery = trpc.training.status.useQuery();
  const showcaseQuery = trpc.showcase.list.useQuery({ limit: 9 });
  const unreadQuery = trpc.notifications.unreadCount.useQuery();
  const posesQuery = trpc.poses.all.useQuery();

  const credits = creditsQuery.data;
  const recentImages = imagesQuery.data ?? [];
  const loraStatus = trainingQuery.data?.loraStatus ?? "none";
  const showcaseImages = showcaseQuery.data ?? [];
  const poseCategories = posesQuery.data ?? [];
  const isLoading = creditsQuery.isLoading || imagesQuery.isLoading;

  // Pending görseller varken otomatik polling
  const hasPending = recentImages.some((img) => img.status === "pending" || img.status === "processing");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        imagesQuery.refetch();
      }, 5000);
    } else if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [hasPending]);

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
    await Promise.all([creditsQuery.refetch(), imagesQuery.refetch(), trainingQuery.refetch(), showcaseQuery.refetch(), posesQuery.refetch()]);
    setRefreshing(false);
  }, [creditsQuery, imagesQuery, trainingQuery]);

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/content-reference?mode=quick" as any);
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
                {t("home.title")}
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                {t("home.tagline")}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
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
              <Text style={{ fontSize: 18, color: "#fff" }}>🔔</Text>
              {(unreadQuery.data?.count ?? 0) > 0 && (
                <View style={{
                  position: "absolute", top: 2, right: 2,
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: "#FF3B30",
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#fff" }}>
                    {unreadQuery.data!.count > 9 ? "9+" : unreadQuery.data!.count}
                  </Text>
                </View>
              )}
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
                    {t("home.remainingCredits")}
                  </Text>
                  <Text style={{ fontSize: 32, fontWeight: "800", color: colors.primary, marginTop: 6 }}>
                    {remainingCredit}
                  </Text>
                </View>
                <View style={{ height: 40, width: 1, backgroundColor: colors.border, marginTop: 4 }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {t("home.plan")}
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
                    {t("home.created")}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, marginTop: 6 }}>
                    {recentImages.filter((img) => img.status === "completed").length}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Processing Banner ── */}
        {!isLoading && recentImages.some((img) => img.status === "pending" || img.status === "processing") && (
          <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const pendingImg = recentImages.find((img) => img.status === "pending" || img.status === "processing");
                if (pendingImg?.replicateJobId) {
                  router.push({ pathname: "/generate-image" as any, params: { contentImageUri: pendingImg.contentImageUrl, mode: "lora", autoStart: "false" } });
                } else {
                  router.push("/gallery");
                }
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "rgba(233,75,143,0.12)" : "rgba(233,75,143,0.08)",
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: "rgba(233,75,143,0.15)",
              })}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                  Görselleriniz hazırlanıyor...
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  Tamamlandığında bildirim alacaksınız.
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.primary }}>›</Text>
            </Pressable>
          </View>
        )}

        {/* ── CTA Buttons ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          {loraStatus === "ready" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/content-reference?mode=quick" as any);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  gap: 4,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Hızlı Oluştur</Text>
                </View>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>~1 dk · 1 kredi</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/content-reference?mode=lora" as any);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? colors.border : colors.surface,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>🧠</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>LoRA ile Yap</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.muted }}>~10 dk · 5 kredi</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleCreateNew}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#D93B7F" : colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
              })}
            >
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Görsel Oluştur</Text>
            </Pressable>
          )}
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 12, flexDirection: "row", gap: 10 }}>
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
              {t("home.aiModel")}
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
              {t("home.references")}
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
              {t("home.settings")}
            </Text>
          </Pressable>
        </View>

        {/* ── Recent Images ── */}
        {/* ── Recent Images — Horizontal Slider ── */}
        {!isLoading && recentImages.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                {t("home.recentImages")}
              </Text>
              <Pressable onPress={() => router.push("/gallery")}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                  {t("home.seeAll")}
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingRight: 20 }}>
                {recentImages.slice(0, 10).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleImagePress(item.id)}
                    style={({ pressed }) => ({
                      width: 110,
                      height: 110,
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
                      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                    {item.status === "failed" && (
                      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,59,48,0.85)", paddingVertical: 3, alignItems: "center" }}>
                        <Text style={{ fontSize: 9, color: "#fff", fontWeight: "600" }}>{t("home.failed")}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Showcase — Hazır Pozlar + Topluluk ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {t("home.showcase")}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t("home.showcaseSub")}
            </Text>
          </View>

          {/* Hazır Poz Kategorileri */}
          {poseCategories.map((cat) => (
            <View key={cat.id} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/pose-category" as any, params: { id: String(cat.id) } });
                }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {cat.emoji} {cat.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Tümü ›</Text>
              </Pressable>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(cat.poses || []).map((pose: any) => (
                    <Pressable
                      key={pose.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: "/generate-image" as any, params: { contentImageUri: pose.imageUrl, autoStart: "false" } });
                      }}
                      style={({ pressed }) => ({
                        width: 130,
                        borderRadius: 14,
                        overflow: "hidden",
                        backgroundColor: colors.surface,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      })}
                    >
                      <Image
                        source={{ uri: pose.imageUrl }}
                        style={{ width: 130, height: 170 }}
                        contentFit="cover"
                        transition={300}
                      />
                      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 6, paddingHorizontal: 8 }}>
                        <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>{pose.label}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}

          {/* Topluluk Görselleri */}
          {showcaseImages.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
                🌟 Topluluk
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {showcaseImages.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      borderRadius: 14,
                      overflow: "hidden",
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={300}
                    />
                    {item.style && (
                      <View style={{ position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: "#fff", fontWeight: "600" }}>{item.style}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}


import React, { useState, useRef } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { saveImageToGallery, shareImage, shareToInstagramStories, isInstagramInstalled } from "@/lib/image-utils";
import { hasActiveSubscription } from "@/lib/purchases";
import { getStyleById } from "@/constants/styles";
import { useI18n } from "@/lib/i18n-context";
import { getSessionToken } from "@/lib/_core/auth";

type ScreenState = "preview" | "generating" | "selecting" | "success" | "error";

interface VariantResult {
  jobId: string;
  variant: string;
  loraScale: number;
  promptStrength: number;
  imageUrl: string | null;
  status: "pending" | "processing" | "completed" | "failed";
}

const VARIANT_LABELS: Record<string, string> = {
  "net": "🎯 Net",
  "dengeli": "⚖️ Dengeli",
};

export default function GenerateImageScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const params = useLocalSearchParams();
  const contentImageUri = params.contentImageUri as string;
  const autoStart = params.autoStart === "true";
  const generateMode = (params.mode as string) || "auto";
  const styleId = (params.styleId as string) || "professional";
  const style = getStyleById(styleId);

  const [state, setState] = useState<ScreenState>(autoStart ? "generating" : "preview");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [variants, setVariants] = useState<VariantResult[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const generatingRef = useRef(false);

  const createMutation = trpc.generatedImages.create.useMutation();

  const stopAllPolling = () => {
    pollingRef.current.forEach((id) => clearInterval(id));
    pollingRef.current = [];
  };

  const pollVariant = (jobId: string, index: number) => {
    let attempts = 0;
    const maxAttempts = 180;

    const intervalId = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        setVariants((prev) => prev.map((v, i) => i === index ? { ...v, status: "failed" } : v));
        return;
      }

      try {
        const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
        const res = await fetch(
          `${apiBase}/api/trpc/generatedImages.checkStatus?input=${encodeURIComponent(JSON.stringify({ json: { jobId } }))}`,
          {
            credentials: "include",
            headers: { Authorization: `Bearer ${await getSessionToken()}` },
          },
        );
        const json = await res.json();
        const status = json?.result?.data?.json;

        if (status?.status === "completed" && status?.imageUrl) {
          clearInterval(intervalId);
          setVariants((prev) => prev.map((v, i) =>
            i === index ? { ...v, status: "completed", imageUrl: status.imageUrl } : v
          ));
        } else if (status?.status === "failed") {
          clearInterval(intervalId);
          setVariants((prev) => prev.map((v, i) =>
            i === index ? { ...v, status: "failed" } : v
          ));
        }
      } catch {
        // Ağ hatası — devam et
      }
    }, 1500);

    pollingRef.current.push(intervalId);
  };

  const handleGenerate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState("generating");
    setErrorMessage(null);
    setProgress(0);
    setVariants([]);
    setSelectedVariant(null);

    try {
      setProgress(10);

      const result = await createMutation.mutateAsync({
        contentImageUrl: contentImageUri,
        faceImageUrl: contentImageUri,
        prompt: `exact same pose, same angle, same body position, same background, same lighting. ${style.prompt}`,
        style: style.name,
        mode: generateMode as "auto" | "quick" | "lora",
      });

      if (!result.jobId) {
        throw new Error("İş oluşturulamadı");
      }

      setProgress(20);

      // Hızlı mod — sonuç senkron geldi
      const isQuick = (result as any).isQuickMode;
      if (isQuick && (result as any).status === "completed" && (result as any).imageUrl) {
        setGeneratedImage((result as any).imageUrl);
        setProgress(100);
        setState("success");
        generatingRef.current = false;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // Varyantlar varsa her birini ayrı poll et (LoRA modu)
      const variantList: any[] = (result as any).variants || [];
      if (variantList.length > 0) {
        const initialVariants: VariantResult[] = variantList.map((v: any) => ({
          jobId: v.jobId,
          variant: v.variant,
          loraScale: v.loraScale,
          promptStrength: v.promptStrength,
          imageUrl: null,
          status: "pending" as const,
        }));
        setVariants(initialVariants);
        setState("selecting");

        initialVariants.forEach((v, i) => pollVariant(v.jobId, i));
      } else {
        // Tek görsel modu — polling
        pollSingleJob(result.jobId);
      }
    } catch (error: any) {
      stopAllPolling();
      generatingRef.current = false;
      const rawMsg = error?.message || "";
      let friendlyMsg = "Görsel oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.";

      if (rawMsg.includes("kredi") || rawMsg.includes("credit") || rawMsg.includes("Insufficient")) {
        friendlyMsg = "Yeterli krediniz yok.";
        Alert.alert("Krediniz Bitti", "Görsel oluşturmak için kredi satın almanız gerekiyor.", [
          { text: "İptal", style: "cancel" },
          { text: "Kredi Satın Al", onPress: () => router.push("/pricing") },
        ]);
        setState("error");
        return;
      } else if (rawMsg.includes("Yüz fotoğrafı") || rawMsg.includes("selfie")) {
        friendlyMsg = "Önce bir selfie yüklemelisin.";
        Alert.alert("Selfie Gerekli", "Görsel oluşturmak için en az 1 selfie yüklemelisin.", [
          { text: "Tamam", onPress: () => router.back() },
        ]);
        setState("error");
        return;
      } else if (rawMsg.includes("timeout") || rawMsg.includes("zaman aşımı")) {
        friendlyMsg = "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.";
      }

      setErrorMessage(friendlyMsg);
      setState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const pollSingleJob = (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 150;

    const intervalId = setInterval(async () => {
      attempts++;
      setProgress(Math.min((attempts / maxAttempts) * 100, 95));

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        setErrorMessage("İşlem zaman aşımına uğradı.");
        setState("error");
        return;
      }

      try {
        const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
        const res = await fetch(
          `${apiBase}/api/trpc/generatedImages.checkStatus?input=${encodeURIComponent(JSON.stringify({ json: { jobId } }))}`,
          {
            credentials: "include",
            headers: { Authorization: `Bearer ${await getSessionToken()}` },
          },
        );
        const json = await res.json();
        const status = json?.result?.data?.json;

        if (status?.status === "completed" && status?.imageUrl) {
          clearInterval(intervalId);
          setGeneratedImage(status.imageUrl);
          setProgress(100);
          setState("success");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (status?.status === "failed") {
          clearInterval(intervalId);
          setErrorMessage("Görsel oluşturulamadı");
          setState("error");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch {
        // devam
      }
    }, 1000);

    pollingRef.current.push(intervalId);
  };

  const handleSelectVariant = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVariant(index);
  };

  const handleConfirmSelection = () => {
    if (selectedVariant === null) return;
    const chosen = variants[selectedVariant];
    if (!chosen?.imageUrl) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopAllPolling();
    setGeneratedImage(chosen.imageUrl);
    setState("success");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopAllPolling();
    generatingRef.current = false;
    setState("preview");
    setErrorMessage(null);
    setProgress(0);
    setVariants([]);
    setSelectedVariant(null);
  };

  React.useEffect(() => {
    if (autoStart && !hasStarted && contentImageUri) {
      setHasStarted(true);
      handleGenerate();
    }
  }, [autoStart, hasStarted, contentImageUri]);

  React.useEffect(() => {
    return () => stopAllPolling();
  }, []);

  const handleSaveToGallery = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const saved = await saveImageToGallery(generatedImage);
    if (saved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("generate.saved"), t("generate.savedDesc"));
    } else {
      Alert.alert("Hata", "Görsel kaydedilemedi.");
    }
  };

  const handleShare = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareImage(generatedImage);
  };

  const handleInstagramShare = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isPremium = await hasActiveSubscription();
    if (!isPremium) {
      Alert.alert("Premium Özellik 👑", "Instagram'da direkt paylaşım Pro ve Premium abonelere özeldir.", [
        { text: "İptal" },
        { text: "Paketleri Gör", onPress: () => router.push("/pricing") },
      ]);
      return;
    }
    const installed = await isInstagramInstalled();
    if (!installed) {
      Alert.alert("Instagram Bulunamadı", "Instagram uygulaması yüklü değil.");
      return;
    }
    const shared = await shareToInstagramStories(generatedImage);
    if (!shared) await shareImage(generatedImage);
  };

  // ─── SELECTING (2 varyasyon) ───
  if (state === "selecting") {
    const completedCount = variants.filter((v) => v.status === "completed").length;
    const allDone = variants.every((v) => v.status === "completed" || v.status === "failed");

    return (
      <ScreenContainer>
        <ScreenHeader title="En İyisini Seç" showBack={false} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 20, gap: 16 }}>
            <View style={{ alignItems: "center", gap: 4, paddingTop: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>
                {allDone ? "Hangisi daha güzel? 🤔" : `Görseller hazırlanıyor... (${completedCount}/2)`}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                {allDone
                  ? "2 farklı stil ile ürettik. Beğendiğini seç!"
                  : "Her biri farklı ayarlarla üretiliyor"}
              </Text>
            </View>

            {variants.map((v, index) => {
              const isSelected = selectedVariant === index;
              const isReady = v.status === "completed" && v.imageUrl;
              const isFailed = v.status === "failed";
              const label = VARIANT_LABELS[v.variant] || v.variant;

              return (
                <Pressable
                  key={v.jobId}
                  onPress={() => isReady ? handleSelectVariant(index) : null}
                  disabled={!isReady}
                  style={({ pressed }) => ({
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: isSelected ? 3 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                    opacity: isFailed ? 0.5 : 1,
                    transform: [{ scale: pressed && isReady ? 0.98 : 1 }],
                  })}
                >
                  {/* Label bar */}
                  <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: isSelected ? "rgba(233,75,143,0.08)" : "transparent",
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: isSelected ? colors.primary : colors.foreground }}>
                      {label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      LoRA: {v.loraScale} · Güç: {v.promptStrength}
                    </Text>
                  </View>

                  {/* Image or loading */}
                  {isReady ? (
                    <Image source={{ uri: v.imageUrl! }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" transition={300} />
                  ) : isFailed ? (
                    <View style={{ width: "100%", aspectRatio: 16 / 9, justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: 32 }}>❌</Text>
                      <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>Oluşturulamadı</Text>
                    </View>
                  ) : (
                    <View style={{ width: "100%", aspectRatio: 16 / 9, justifyContent: "center", alignItems: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>Hazırlanıyor...</Text>
                    </View>
                  )}

                  {/* Selected badge */}
                  {isSelected && (
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      backgroundColor: colors.primary, borderRadius: 12,
                      paddingHorizontal: 10, paddingVertical: 4,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>✓ Seçildi</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* Confirm button */}
            {selectedVariant !== null && variants[selectedVariant]?.imageUrl && (
              <Pressable
                onPress={handleConfirmSelection}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 18, borderRadius: 16, alignItems: "center",
                  flexDirection: "row", justifyContent: "center", gap: 8,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3, shadowRadius: 10,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                  Bu Görseli Kullan ✨
                </Text>
              </Pressable>
            )}

            {/* Retry */}
            {allDone && completedCount === 0 && (
              <Pressable onPress={handleRetry} style={{ alignItems: "center", padding: 12 }}>
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>Tekrar Dene</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => { stopAllPolling(); generatingRef.current = false; router.navigate("/(tabs)/home" as any); }}
              style={{ alignItems: "center", padding: 12 }}
            >
              <Text style={{ fontSize: 13, color: colors.muted }}>Ana Sayfaya Dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── SUCCESS ───
  if (state === "success" && generatedImage) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Sonuç" showBack={false} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>{t("generate.success")}</Text>
              <Text style={{ fontSize: 14, color: colors.muted }}>{t("generate.successDesc")}</Text>
            </View>

            <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
              <Image source={{ uri: generatedImage }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={handleSaveToGallery}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 14, borderRadius: 14, alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{t("generate.save")}</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: colors.surface,
                  paddingVertical: 14, borderRadius: 14, alignItems: "center",
                  borderWidth: 1, borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>{t("generate.share")}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleInstagramShare}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? "#C13584" : "#E1306C",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 16 }}>📷</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{t("generate.instagramShare")}</Text>
              <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>PRO</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate("/(tabs)/home" as any); }}
              style={({ pressed }) => ({
                backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 14, alignItems: "center",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{t("generate.goHome")}</Text>
            </Pressable>

            <Pressable
              onPress={() => { setGeneratedImage(null); setState("preview"); router.replace("/content-reference"); }}
              style={{ alignItems: "center", padding: 8 }}
            >
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>{t("generate.createNew")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── GENERATING (tek görsel modu) ───
  if (state === "generating") {
    return (
      <ScreenContainer>
        <ScreenHeader title={t("generate.generating")} showBack={false} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 24 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(233,75,143,0.1)", justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
            {generateMode === "quick" ? "⚡ Hızlı Oluştur" : `${style.emoji} ${style.name} Stil`}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
            {generateMode === "quick" ? "Görselin hazırlanıyor..." : t("generate.waitMessage")}
          </Text>
          {generateMode !== "quick" && (
            <>
              <View style={{ width: "100%", height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                <View style={{ width: `${progress}%`, height: 6, backgroundColor: colors.primary, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12, color: colors.muted }}>%{Math.round(progress)}</Text>
            </>
          )}

          <Pressable
            onPress={() => { stopAllPolling(); generatingRef.current = false; router.navigate("/(tabs)/home" as any); }}
            style={{ marginTop: 16, padding: 12 }}
          >
            <Text style={{ fontSize: 13, color: colors.muted }}>Ana Sayfaya Dön</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ─── ERROR ───
  if (state === "error") {
    return (
      <ScreenContainer>
        <ScreenHeader title="Hata" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 20 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(255,59,48,0.1)", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>😔</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>{t("generate.error")}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
            {errorMessage || "Görsel oluşturulurken hata oluştu."}
          </Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#D93B7F" : colors.primary,
              paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t("generate.retry")}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>{t("generate.goBack")}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ─── PREVIEW ───
  return (
    <ScreenContainer>
      <ScreenHeader title={t("generate.title")} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("generate.reference")}
            </Text>
            <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
              <Image source={{ uri: contentImageUri }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" />
            </View>
          </View>

          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#D93B7F" : colors.primary,
              paddingVertical: 18, borderRadius: 16, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 10,
            })}
          >
            <Text style={{ fontSize: 20 }}>✦</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t("generate.title")}</Text>
          </Pressable>

          <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 }}>
            AI, 2 farklı stilde görsel üretecek.{"\n"}En beğendiğini seçebilirsin.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

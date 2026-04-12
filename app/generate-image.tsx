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

type ScreenState = "preview" | "generating" | "success" | "error";

export default function GenerateImageScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const contentImageUri = params.contentImageUri as string;
  const autoStart = params.autoStart === "true";

  const [state, setState] = useState<ScreenState>(autoStart ? "generating" : "preview");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createMutation = trpc.generatedImages.create.useMutation();

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState("generating");
    setErrorMessage(null);
    setProgress(0);

    try {
      setProgress(15);

      const result = await createMutation.mutateAsync({
        contentImageUrl: contentImageUri,
        faceImageUrl: contentImageUri,
        prompt: "exact same pose, same angle, same body position, same background, same lighting. Photorealistic, high quality, professional photography, 8k, detailed.",
        style: "Professional",
      });

      if (!result.jobId) {
        throw new Error("İş oluşturulamadı");
      }

      // Polling
      let attempts = 0;
      const maxAttempts = 150; // 2.5 dakika

      pollingRef.current = setInterval(async () => {
        attempts++;
        setProgress(Math.min((attempts / maxAttempts) * 100, 95));

        if (attempts >= maxAttempts) {
          stopPolling();
          setErrorMessage("İşlem zaman aşımına uğradı. Tekrar deneyin.");
          setState("error");
          return;
        }

        try {
          const res = await fetch(
            `http://localhost:3000/api/trpc/generatedImages.checkStatus?input=${encodeURIComponent(JSON.stringify({ json: { jobId: result.jobId } }))}`,
            { credentials: "include" },
          );
          const json = await res.json();
          const status = json?.result?.data?.json;

          if (status?.status === "completed" && status?.imageUrl) {
            stopPolling();
            setGeneratedImage(status.imageUrl);
            setProgress(100);
            setState("success");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (status?.status === "failed") {
            stopPolling();
            setErrorMessage(status.error ? "Görsel oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin." : "Görsel oluşturulamadı");
            setState("error");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } catch {
          // Polling hatası — devam et, ağ geçici sorun olabilir
        }
      }, 1000);
    } catch (error: any) {
      stopPolling();
      // Kullanıcı dostu hata mesajları
      const rawMsg = error?.message || "";
      let friendlyMsg = "Görsel oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.";
      if (rawMsg.includes("429") || rawMsg.includes("throttled") || rawMsg.includes("rate limit")) {
        friendlyMsg = "Sunucularımız şu an yoğun. Lütfen birkaç saniye bekleyip tekrar deneyin.";
      } else if (rawMsg.includes("kredi") || rawMsg.includes("credit") || rawMsg.includes("Insufficient")) {
        friendlyMsg = "Yeterli krediniz yok. Kredi satın alarak devam edebilirsiniz.";
      } else if (rawMsg.includes("timeout") || rawMsg.includes("zaman aşımı")) {
        friendlyMsg = "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.";
      }
      setErrorMessage(friendlyMsg);
      setState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState("preview");
    setErrorMessage(null);
    setProgress(0);
  };

  // Auto-start generation if coming from content-reference
  React.useEffect(() => {
    if (autoStart && !hasStarted && contentImageUri) {
      setHasStarted(true);
      handleGenerate();
    }
  }, [autoStart, hasStarted, contentImageUri]);

  const handleSaveToGallery = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const saved = await saveImageToGallery(generatedImage);
    if (saved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kaydedildi ✅", "Görsel galerine kaydedildi.");
    } else {
      Alert.alert("Hata", "Görsel kaydedilemedi.");
    }
  };

  const handleShare = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shared = await shareImage(generatedImage);
    if (!shared) {
      Alert.alert("Hata", "Paylaşım başarısız.");
    }
  };

  const handleInstagramShare = async () => {
    if (!generatedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Premium kontrolü
    const isPremium = await hasActiveSubscription();
    if (!isPremium) {
      Alert.alert(
        "Premium Özellik 👑",
        "Instagram'da direkt paylaşım Pro ve Premium abonelere özeldir.",
        [
          { text: "İptal" },
          { text: "Paketleri Gör", onPress: () => router.push("/pricing") },
        ],
      );
      return;
    }

    const installed = await isInstagramInstalled();
    if (!installed) {
      Alert.alert("Instagram Bulunamadı", "Instagram uygulaması yüklü değil.");
      return;
    }

    const shared = await shareToInstagramStories(generatedImage);
    if (!shared) {
      // Fallback: normal paylaşım
      await shareImage(generatedImage);
    }
  };

  // ─── SUCCESS ───
  if (state === "success" && generatedImage) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Sonuç" showBack={false} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>Başarılı! 🎉</Text>
              <Text style={{ fontSize: 14, color: colors.muted }}>Görselin hazırlandı</Text>
            </View>

            <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
              <Image source={{ uri: generatedImage }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" />
            </View>

            {/* Save & Share */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={handleSaveToGallery}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 14, borderRadius: 14, alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>💾 Kaydet</Text>
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
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>📤 Paylaş</Text>
              </Pressable>
            </View>

            {/* Instagram Stories — Premium */}
            <Pressable
              onPress={handleInstagramShare}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: pressed ? "#C13584" : "#E1306C",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 16 }}>📷</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Instagram'da Paylaş</Text>
              <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>PRO</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace("/(tabs)"); }}
              style={({ pressed }) => ({
                backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 14, alignItems: "center",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>Ana Sayfaya Dön</Text>
            </Pressable>

            <Pressable
              onPress={() => { setGeneratedImage(null); setState("preview"); router.replace("/content-reference"); }}
              style={{ alignItems: "center", padding: 8 }}
            >
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>Yeni Görsel Oluştur</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── GENERATING ───
  if (state === "generating") {
    return (
      <ScreenContainer>
        <ScreenHeader title="Oluşturuluyor" showBack={false} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 24 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(233,75,143,0.1)", justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
            AI Görseli Oluşturuyor
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
            Bu işlem 30-60 saniye sürebilir.{"\n"}Lütfen bekleyin...
          </Text>

          {/* Progress bar */}
          <View style={{ width: "100%", height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
            <View style={{ width: `${progress}%`, height: 6, backgroundColor: colors.primary, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 12, color: colors.muted }}>%{Math.round(progress)}</Text>
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
            Bir Sorun Oluştu
          </Text>
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Tekrar Dene</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>Geri Dön</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ─── PREVIEW ───
  return (
    <ScreenContainer>
      <ScreenHeader title="Görsel Oluştur" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, gap: 24 }}>
          {/* Reference Preview */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Referans Görsel
            </Text>
            <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
              <Image source={{ uri: contentImageUri }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" />
            </View>
          </View>

          {/* Generate Button */}
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Görsel Oluştur</Text>
          </Pressable>

          <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 }}>
            AI, kişisel modelini kullanarak seni bu pozda{"\n"}profesyonel bir fotoğraf olarak oluşturacak.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

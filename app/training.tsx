import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";

type TrainingStep = "upload" | "training" | "ready";

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 15;

export default function TrainingScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();

  const statusQuery = trpc.training.status.useQuery();
  const photosQuery = trpc.training.listPhotos.useQuery();
  const uploadMutation = trpc.training.uploadPhoto.useMutation();
  const deleteMutation = trpc.referencePhotos.delete.useMutation();
  const startMutation = trpc.training.start.useMutation();
  const checkStatusQuery = trpc.training.checkStatus.useQuery(undefined, {
    enabled: false,
  });
  const resetMutation = trpc.training.reset.useMutation();

  const [uploading, setUploading] = useState(false);
  const [polling, setPolling] = useState(false);

  const loraStatus = statusQuery.data?.loraStatus ?? "none";
  const photos = photosQuery.data ?? [];

  const currentStep: TrainingStep =
    loraStatus === "ready"
      ? "ready"
      : loraStatus === "training" || loraStatus === "pending"
        ? "training"
        : "upload";

  // Poll training status
  useEffect(() => {
    if (currentStep !== "training") return;
    setPolling(true);

    const interval = setInterval(async () => {
      const result = await checkStatusQuery.refetch();
      if (result.data?.status === "ready" || result.data?.status === "failed") {
        clearInterval(interval);
        setPolling(false);
        statusQuery.refetch();
        if (result.data.status === "failed") {
          Alert.alert("Hata", result.data.error || "Eğitim başarısız oldu");
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStep]);

  const handleDeletePhoto = useCallback((photoId: number) => {
    Alert.alert("Fotoğrafı Sil", "Bu fotoğrafı silmek istediğinize emin misiniz?", [
      { text: "İptal" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await deleteMutation.mutateAsync({ id: photoId });
            utils.training.listPhotos.invalidate();
          } catch {
            Alert.alert("Hata", "Fotoğraf silinemedi");
          }
        },
      },
    ]);
  }, [deleteMutation, utils]);

  const pickPhotos = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      for (const asset of result.assets) {
        if (!asset.base64) continue;
        await uploadMutation.mutateAsync({
          base64: asset.base64,
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        });
      }
      utils.training.listPhotos.invalidate();
    } catch (e) {
      Alert.alert("Hata", "Fotoğraf yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  }, [photos.length]);

  const handleStartTraining = async () => {
    if (photos.length < MIN_PHOTOS) {
      Alert.alert("Yetersiz Fotoğraf", `En az ${MIN_PHOTOS} fotoğraf yüklemelisiniz.`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await startMutation.mutateAsync();
      statusQuery.refetch();
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Eğitim başlatılamadı");
    }
  };

  const handleReset = () => {
    Alert.alert("Sıfırla", "Eğitimi sıfırlayıp tekrar denemek istiyor musunuz?", [
      { text: "İptal" },
      {
        text: "Sıfırla",
        style: "destructive",
        onPress: async () => {
          await resetMutation.mutateAsync();
          statusQuery.refetch();
          photosQuery.refetch();
        },
      },
    ]);
  };

  // ─── READY STATE ───
  if (currentStep === "ready") {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 28, gap: 24, alignItems: "center" }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "rgba(52,199,89,0.12)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 40 }}>✅</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
              AI Modelin Hazır
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
              Kişisel AI modelin başarıyla oluşturuldu.{"\n"}Artık profesyonel görseller üretebilirsin.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.replace("/content-reference");
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#D93B7F" : colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 48,
                borderRadius: 14,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                Görsel Oluştur
              </Text>
            </Pressable>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 32,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                Modeli Güncelle
              </Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/(tabs)")}>
              <Text style={{ fontSize: 14, color: colors.muted }}>Ana Sayfaya Dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── TRAINING STATE ───
  if (currentStep === "training") {
    return <TrainingProgressScreen loraStatus={loraStatus} photoCount={photos.length} colors={colors} onCancel={handleReset} />;
  }

  // ─── UPLOAD STATE ───
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 40,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>← Geri</Text>
          </Pressable>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>
            AI Modelini Oluştur
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            Fotoğraflarını yükle, sana özel AI modeli eğitelim
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -20, gap: 20 }}>
          {/* Instructions Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
              📸 Fotoğraf Rehberi
            </Text>
            <View style={{ gap: 8 }}>
              {[
                "En az 5, ideal olarak 10-15 fotoğraf yükle",
                "Yüz yakın çekim, yarım boy ve tam boy karışık olsun",
                "Farklı açılardan fotoğraflar ekle (önden, yandan)",
                "İyi aydınlatılmış, net fotoğraflar seç",
                "Güneş gözlüğü veya maske olmadan",
              ].map((tip, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 12, color: colors.primary, marginTop: 1 }}>•</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, flex: 1, lineHeight: 18 }}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Photo Counter */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
              Fotoğraflar ({photos.length}/{MAX_PHOTOS})
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: photos.length >= MIN_PHOTOS ? colors.success : colors.warning,
                fontWeight: "600",
              }}
            >
              {photos.length >= MIN_PHOTOS
                ? "✓ Yeterli fotoğraf"
                : `${MIN_PHOTOS - photos.length} fotoğraf daha gerekli`}
            </Text>
          </View>

          {/* Photo Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {photos.map((photo) => (
              <View
                key={photo.id}
                style={{
                  width: "31%",
                  aspectRatio: 1,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: colors.surface,
                }}
              >
                <Image
                  source={{ uri: photo.photoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
                <Pressable
                  onPress={() => handleDeletePhoto(photo.id)}
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginTop: -1 }}>×</Text>
                </Pressable>
              </View>
            ))}

            {/* Add Photo Button */}
            {photos.length < MAX_PHOTOS && (
              <Pressable
                onPress={pickPhotos}
                disabled={uploading}
                style={({ pressed }) => ({
                  width: "31%",
                  aspectRatio: 1,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={{ fontSize: 28, color: colors.primary }}>+</Text>
                    <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Ekle</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Start Training Button */}
          <Pressable
            onPress={handleStartTraining}
            disabled={photos.length < MIN_PHOTOS || startMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor:
                photos.length < MIN_PHOTOS || startMutation.isPending
                  ? colors.border
                  : pressed
                    ? "#D93B7F"
                    : colors.primary,
              paddingVertical: 18,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              transform: [{ scale: pressed && photos.length >= MIN_PHOTOS ? 0.97 : 1 }],
              shadowColor: photos.length >= MIN_PHOTOS ? colors.primary : "transparent",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            })}
          >
            {startMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ fontSize: 20 }}>🧠</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                  AI Modelimi Eğit
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}


// ─── Training Progress Component ───

interface TrainingProgressProps {
  loraStatus: string;
  photoCount: number;
  colors: ReturnType<typeof useColors>;
  onCancel: () => void;
}

const STEPS = [
  { key: "upload", icon: "📤", label: "Fotoğraflar hazırlanıyor", duration: "~30 sn" },
  { key: "queue", icon: "⏳", label: "Sıraya alındı", duration: "~1 dk" },
  { key: "training", icon: "🧠", label: "AI modelin eğitiliyor", duration: "~5-8 dk" },
  { key: "finalizing", icon: "✨", label: "Model tamamlanıyor", duration: "~1 dk" },
];

function TrainingProgressScreen({ loraStatus, photoCount, colors, onCancel }: TrainingProgressProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [elapsed, setElapsed] = useState(0);

  const activeStep = loraStatus === "pending" ? 1 : 2;

  useEffect(() => {
    // Spin animation
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();

    // Elapsed timer
    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);

    return () => {
      spin.stop();
      pulse.stop();
      clearInterval(timer);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 28, gap: 28, alignItems: "center" }}>
          {/* Animated Icon */}
          <Animated.View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "rgba(233,75,143,0.08)",
              justifyContent: "center",
              alignItems: "center",
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
              <Text style={{ fontSize: 44 }}>🧠</Text>
            </Animated.View>
          </Animated.View>

          {/* Title */}
          <View style={{ gap: 6, alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
              AI Modelin Eğitiliyor
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
              Yapay zeka seni tanımayı öğreniyor.{"\n"}Bu işlem genellikle 5-10 dakika sürer.
            </Text>
          </View>

          {/* Timer */}
          <View
            style={{
              backgroundColor: colors.surface,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary, fontVariant: ["tabular-nums"] }}>
              ⏱ {formatTime(elapsed)}
            </Text>
          </View>

          {/* Steps */}
          <View style={{ width: "100%", gap: 0 }}>
            {STEPS.map((step, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              const isFuture = i > activeStep;

              return (
                <View key={step.key} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                  {/* Line + Dot */}
                  <View style={{ alignItems: "center", width: 28 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: isDone
                          ? colors.success
                          : isActive
                            ? colors.primary
                            : colors.border,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {isDone ? (
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>
                      ) : isActive ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: "#fff", fontSize: 12 }}>{i + 1}</Text>
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View
                        style={{
                          width: 2,
                          height: 32,
                          backgroundColor: isDone ? colors.success : colors.border,
                        }}
                      />
                    )}
                  </View>

                  {/* Label */}
                  <View style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? 16 : 0 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "500",
                        color: isFuture ? colors.muted : colors.foreground,
                      }}
                    >
                      {step.icon} {step.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {isDone ? "Tamamlandı" : isActive ? "Devam ediyor..." : step.duration}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Info Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              width: "100%",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Eğitim fotoğrafı</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>{photoCount} adet</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Model tipi</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Flux LoRA</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Tahmini süre</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>5-10 dakika</Text>
            </View>
          </View>

          {/* Tip */}
          <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 }}>
            💡 Uygulamayı kapatabilirsin.{"\n"}Modelin hazır olduğunda bildirim göndereceğiz.
          </Text>

          <Pressable onPress={onCancel} style={{ padding: 8 }}>
            <Text style={{ fontSize: 13, color: colors.error }}>Eğitimi İptal Et</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

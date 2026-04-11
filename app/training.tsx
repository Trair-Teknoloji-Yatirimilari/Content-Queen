import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
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
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 28, gap: 24, alignItems: "center" }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "rgba(233,75,143,0.12)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
              AI Modelin Eğitiliyor
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
              Bu işlem 5-10 dakika sürebilir.{"\n"}Uygulamayı kapatabilirsin, hazır olunca bildirim göndereceğiz.
            </Text>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                width: "100%",
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Durum</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                  {loraStatus === "pending" ? "Sırada bekliyor..." : "Eğitiliyor..."}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Fotoğraf sayısı</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                  {photos.length}
                </Text>
              </View>
            </View>

            <Pressable onPress={handleReset}>
              <Text style={{ fontSize: 13, color: colors.error }}>Eğitimi İptal Et</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
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

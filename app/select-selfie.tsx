import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 3;

export default function SelectSelfieScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const mode = (params.mode as string) || "quick";
  const contentImageUri = (params.contentImageUri as string) || "";

  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const facePhotosQuery = trpc.referencePhotos.list.useQuery({ photoType: "face" });
  const uploadMutation = trpc.referencePhotos.upload.useMutation();
  const deleteMutation = trpc.referencePhotos.delete.useMutation();
  const existingFacePhotos = facePhotosQuery.data ?? [];

  const totalPhotos = existingFacePhotos.length + photos.length;
  const hasEnough = totalPhotos >= MIN_PHOTOS;

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = await Promise.all(
          result.assets.map(async (asset) => {
            let base64 = asset.base64;
            if (!base64 && asset.uri) {
              base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            return { uri: asset.uri, base64: base64 || "" };
          }),
        );
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf seçilemedi.");
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Zaten yeterli yüz fotoğrafı varsa direkt devam et
    if (existingFacePhotos.length >= MIN_PHOTOS) {
      router.push({
        pathname: "/generate-image",
        params: { contentImageUri, autoStart: "true", mode },
      } as any);
      return;
    }

    // Yeni fotoğrafları yükle
    if (photos.length === 0 && existingFacePhotos.length === 0) {
      Alert.alert("Fotoğraf Gerekli", "En az 1 selfie yüklemelisin.");
      return;
    }

    setIsUploading(true);
    try {
      for (const photo of photos) {
        await uploadMutation.mutateAsync({
          base64: photo.base64,
          photoType: "face",
          fileName: `face-${Date.now()}.jpg`,
        });
      }
      router.push({
        pathname: "/generate-image",
        params: { contentImageUri, autoStart: "true", mode },
      } as any);
    } catch {
      Alert.alert("Hata", "Fotoğraflar yüklenirken sorun oluştu.");
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-redirect yok — kullanıcı her zaman selfie ekranını görsün
  // Mevcut selfielerini görebilir veya yenisini ekleyebilir

  if (facePhotosQuery.isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Selfie Yükle" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Selfie Yükle" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, gap: 20, paddingTop: 16 }}>
          {/* Header */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 48 }}>🤳</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
              Yüzünü Tanıyalım
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
              1 net selfie yükle, daha iyi sonuç için 3'e kadar ekleyebilirsin.
            </Text>
          </View>

          {/* Tips */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>💡 İpuçları</Text>
            <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
              • Yüzün net görünsün, gözlük olmasın{"\n"}
              • Farklı açılar: önden, hafif yandan{"\n"}
              • İyi aydınlatma, bulanık olmasın
            </Text>
          </View>

          {/* Photo Grid */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
              const photo = photos[index];
              const existing = !photo && existingFacePhotos[index];
              const isOptional = index >= MIN_PHOTOS;

              return (
                <View key={index} style={{ flex: 1, aspectRatio: 1 }}>
                  {photo ? (
                    <Pressable onPress={() => removePhoto(index)} style={{ flex: 1 }}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={{ flex: 1, borderRadius: 14 }}
                        contentFit="cover"
                      />
                      <View style={{
                        position: "absolute", top: 4, right: 4,
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: "rgba(255,59,48,0.9)",
                        justifyContent: "center", alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>✕</Text>
                      </View>
                    </Pressable>
                  ) : existing ? (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert("Selfie Sil", "Bu selfie'yi silmek istiyor musun?", [
                          { text: "İptal", style: "cancel" },
                          {
                            text: "Sil", style: "destructive",
                            onPress: async () => {
                              await deleteMutation.mutateAsync({ id: existing.id });
                              facePhotosQuery.refetch();
                            },
                          },
                        ]);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Image
                        source={{ uri: existing.photoUrl }}
                        style={{ flex: 1, borderRadius: 14 }}
                        contentFit="cover"
                      />
                      <View style={{
                        position: "absolute", top: 4, right: 4,
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: "rgba(255,59,48,0.9)",
                        justifyContent: "center", alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>✕</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={pickPhoto}
                      style={({ pressed }) => ({
                        flex: 1, borderRadius: 14,
                        borderWidth: 2, borderStyle: "dashed",
                        borderColor: pressed ? colors.primary : colors.border,
                        justifyContent: "center", alignItems: "center",
                        backgroundColor: pressed ? "rgba(233,75,143,0.05)" : "transparent",
                      })}
                    >
                      <Text style={{ fontSize: 28, color: colors.muted }}>+</Text>
                      <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                        {isOptional ? "opsiyonel" : "zorunlu"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          {/* Continue Button */}
          <Pressable
            onPress={handleContinue}
            disabled={!hasEnough || isUploading}
            style={({ pressed }) => ({
              backgroundColor: hasEnough ? (pressed ? "#D93B7F" : colors.primary) : colors.border,
              paddingVertical: 16, borderRadius: 14, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              opacity: isUploading ? 0.7 : 1,
              transform: [{ scale: pressed && hasEnough ? 0.97 : 1 }],
            })}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>✦</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: hasEnough ? "#fff" : colors.muted }}>
                  {hasEnough ? "Devam Et" : "1 selfie yükle"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

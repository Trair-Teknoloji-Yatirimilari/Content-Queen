import React from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { saveImageToGallery, shareImage } from "@/lib/image-utils";

export default function ImageDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageId = Number(params.id);

  const imageQuery = trpc.generatedImages.getById.useQuery({ id: imageId }, { enabled: !!imageId });
  const deleteMutation = trpc.generatedImages.delete.useMutation();
  const utils = trpc.useUtils();
  const image = imageQuery.data;

  const handleSave = async () => {
    if (!image?.generatedImageUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const saved = await saveImageToGallery(image.generatedImageUrl);
    if (saved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kaydedildi ✅", "Görsel galerine kaydedildi.");
    }
  };

  const handleShare = async () => {
    if (!image?.generatedImageUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareImage(image.generatedImageUrl);
  };

  const handleDelete = () => {
    Alert.alert("Görseli Sil", "Bu görseli silmek istediğinize emin misiniz?", [
      { text: "İptal" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteMutation.mutateAsync({ id: imageId });
          utils.generatedImages.list.invalidate();
          router.back();
        },
      },
    ]);
  };

  if (imageQuery.isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Görsel" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!image) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Görsel" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 40 }}>😔</Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>Görsel bulunamadı</Text>
        </View>
      </ScreenContainer>
    );
  }

  const createdAt = new Date(image.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ScreenContainer>
      <ScreenHeader title="Görsel Detay" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 16 }}>
          {/* Image */}
          <Image
            source={{ uri: image.generatedImageUrl }}
            style={{ width: "100%", aspectRatio: 1 }}
            contentFit="cover"
            transition={300}
          />

          <View style={{ paddingHorizontal: 20, gap: 16 }}>
            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>💾 Kaydet</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surface,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>📤 Paylaş</Text>
              </Pressable>
            </View>

            {/* Info Card */}
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 12 }}>
              <Row label="Tarih" value={createdAt} colors={colors} />
              <Row label="Stil" value={image.style || "Profesyonel"} colors={colors} />
              <Row label="Durum" value={
                image.status === "completed" ? "Tamamlandı ✅" :
                image.status === "failed" ? "Başarısız ❌" :
                "İşleniyor ⏳"
              } colors={colors} />
              <Row label="Kredi" value={`${image.creditsUsed} kredi`} colors={colors} />
            </View>

            {/* Prompt */}
            {image.prompt && (
              <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Prompt
                </Text>
                <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>
                  {image.prompt}
                </Text>
              </View>
            )}

            {/* Delete */}
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: pressed ? "rgba(255,59,48,0.1)" : "transparent",
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.error }}>Görseli Sil</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{value}</Text>
    </View>
  );
}

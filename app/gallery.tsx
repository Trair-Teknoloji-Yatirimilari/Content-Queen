import React from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList, Dimensions } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { saveImageToGallery, shareImage } from "@/lib/image-utils";
import { Alert } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GAP = 3;
const COLS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLS + 1)) / COLS;

export default function GalleryScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const imagesQuery = trpc.generatedImages.list.useQuery();
  const deleteMutation = trpc.generatedImages.delete.useMutation();
  const images = imagesQuery.data ?? [];

  const handleSave = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const saved = await saveImageToGallery(url);
    if (saved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kaydedildi ✅", "Görsel galerine kaydedildi.");
    }
  };

  const handleShare = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareImage(url);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Görseli Sil", "Bu görseli silmek istediğinize emin misiniz?", [
      { text: "İptal" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await deleteMutation.mutateAsync({ id });
            utils.generatedImages.list.invalidate();
          } catch {
            Alert.alert("Hata", "Görsel silinemedi.");
          }
        },
      },
    ]);
  };

  if (imagesQuery.isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Görsellerim" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Görsellerim" subtitle={`${images.length} görsel`} />
      <FlatList
        data={images}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLS}
        contentContainerStyle={{ padding: GAP }}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSave(item.generatedImageUrl)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Görsel", undefined, [
                { text: "Kaydet", onPress: () => handleSave(item.generatedImageUrl) },
                { text: "Paylaş", onPress: () => handleShare(item.generatedImageUrl) },
                { text: "Sil", style: "destructive", onPress: () => handleDelete(item.id) },
                { text: "İptal", style: "cancel" },
              ]);
            }}
            style={({ pressed }) => ({
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              borderRadius: 4,
              overflow: "hidden",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Image
              source={{ uri: item.generatedImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
            {(item.status === "pending" || item.status === "processing") && (
              <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✨</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Henüz görsel yok</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Oluşturduğun görseller burada görünecek</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

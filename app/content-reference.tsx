import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

interface ContentReference {
  uri: string;
  name: string;
}

export default function ContentReferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const [contentImage, setContentImage] = useState<ContentReference | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = trpc.referencePhotos.upload.useMutation();

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setContentImage({
          uri: result.assets[0].uri,
          name: "Secilen Gorsel",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Hata", "Fotoğraf seçilirken hata oluştu");
    }
  };

  const handleContinue = async () => {
    if (!contentImage) {
      Alert.alert("Hata", "Lütfen bir içerik referansı seçin");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsUploading(true);

    try {
      // Fotoğrafı base64 olarak oku ve Supabase'e yükle
      const FileSystem = await import("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(contentImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await uploadMutation.mutateAsync({
        base64,
        photoType: "content",
        fileName: `content-${Date.now()}.jpg`,
      });

      // Public URL ile generate ekranına git
      router.push({
        pathname: "/generate-image",
        params: { contentImageUri: result.photoUrl },
      });
    } catch (error) {
      Alert.alert("Hata", "Fotoğraf yüklenirken hata oluştu. Tekrar deneyin.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContentImage(null);
  };

  return (
    <ScreenContainer className="bg-background">
      <ScreenHeader title="İçerik Referansı" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4 gap-6">

          {/* Upload Area */}
          {!contentImage ? (
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  borderWidth: 2,
                  borderColor: "#E94B8F",
                  borderStyle: "dashed",
                  borderRadius: 12,
                  paddingVertical: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-4xl mb-2">📷</Text>
              <Text className="text-base font-semibold text-foreground mb-1">Fotograf Yukle</Text>
              <Text className="text-xs text-muted">Galeriden bir fotograf sec</Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              <View className="rounded-lg overflow-hidden bg-surface border border-border">
                <Image source={{ uri: contentImage.uri }} className="w-full aspect-square" />
              </View>
              <Pressable
                onPress={clearImage}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? "#FF5252" : "#FF3B30",
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text className="text-white font-semibold text-sm">Degistir</Text>
              </Pressable>
            </View>
          )}

          {/* Instructions */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Ipuclari:</Text>
            <Text className="text-xs text-muted leading-relaxed">
              - Temiz ve iyi aydinlatilmis fotograflar secin{"\n"}- Pozun net ve belirgin olmasi onemli{"\n"}- Kiyafet ve aksesuar detaylari gorulmeli{"\n"}- En az 1080x1080 cozunurluk oneriliyor
            </Text>
          </View>

          {/* Continue Button */}
          {contentImage && (
            <Pressable
              onPress={handleContinue}
              disabled={isUploading}
              style={({ pressed }) => [
                {
                  backgroundColor: isUploading ? "#ccc" : pressed ? "#D93B7F" : "#E94B8F",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  transform: [{ scale: pressed && !isUploading ? 0.97 : 1 }],
                },
              ]}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white font-semibold text-base">Yükleniyor...</Text>
                </>
              ) : (
                <Text className="text-white font-semibold text-base">Görsel Oluştur</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

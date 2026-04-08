import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, Image, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function GenerateImageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contentImageUri = params.contentImageUri as string;
  const selectedPhotoId = params.selectedPhotoId as string;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const createImageMutation = trpc.generatedImages.create.useMutation();

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGenerating(true);

    try {
      const result = await createImageMutation.mutateAsync({
        contentImageUrl: contentImageUri,
        faceImageUrl: "https://via.placeholder.com/300",
        prompt: "Transform this person's appearance to match the style in the reference image. Professional photo transformation.",
        style: "Professional",
      });

      // Polling başlat
      let attempts = 0;
      const maxAttempts = 120; // 2 dakika (1 saniye interval)

      const pollStatus = async () => {
        while (attempts < maxAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Fetch status from API
          const response = await fetch("/api/trpc/generatedImages.checkStatus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: result.jobId }),
          });
          const statusResult = await response.json();

          if (statusResult.status === "completed" && statusResult.imageUrl) {
            setGeneratedImage(statusResult.imageUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsGenerating(false);
            return;
          } else if (statusResult.status === "failed") {
            throw new Error(statusResult.error || "Görsel oluşturulamadı");
          }
        }
        throw new Error("İşlem zaman aşımına uğradı");
      };

      await pollStatus();
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Görsel oluşturulurken hata oluştu");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Görseli cihaza kaydet (gerçek uygulamada)
      Alert.alert("Başarılı", "Görsel telefonunuza kaydedildi");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Hata", "Görsel kaydedilemedi");
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Paylas", "Gorsel sosyal medyada paylasildi");
  };

  const handleNewImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGeneratedImage(null);
    router.replace("/content-reference");
  };

  if (generatedImage) {
    return (
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6 gap-6 flex-1 justify-center">
            {/* Generated Image */}
            <View className="gap-2">
              <Text className="text-2xl font-bold text-foreground text-center">Basarili!</Text>
              <Text className="text-sm text-muted text-center">Gorseliniz hazirlandi</Text>
            </View>

            <View className="rounded-lg overflow-hidden bg-surface border border-border">
              <Image source={{ uri: generatedImage }} className="w-full aspect-square" />
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleDownload}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? "#D93B7F" : "#E94B8F",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Text className="text-white font-semibold text-base">Telefonuma Kaydet</Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Text className="text-foreground font-semibold text-base">Paylas</Text>
              </Pressable>

              <Pressable
                onPress={handleNewImage}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Text className="text-foreground font-semibold text-base">Yeni Gorsel Olustur</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 gap-6 flex-1 justify-center">
          {/* Header */}
          <View className="gap-2 items-center">
            <Text className="text-2xl font-bold text-foreground">Gorsel Olustur</Text>
            <Text className="text-sm text-muted text-center">
              Yapay zeka sizin icin benzersiz bir gorsel olusturuyor
            </Text>
          </View>

          {/* Preview Cards */}
          <View className="gap-3">
            <Text className="text-xs font-semibold text-muted uppercase">Secimleriniz</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-muted mb-2">Icerik Referansi</Text>
                <View className="rounded-lg overflow-hidden bg-surface border border-border">
                  <Image source={{ uri: contentImageUri }} className="w-full aspect-square" />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-2">Yuz Referansi</Text>
                <View className="rounded-lg overflow-hidden bg-surface border border-border">
                  <Image
                    source={{ uri: "https://via.placeholder.com/300" }}
                    className="w-full aspect-square"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Generate Button */}
          <Pressable
            onPress={handleGenerate}
            disabled={isGenerating}
            style={({ pressed }) => [
              {
                backgroundColor: isGenerating ? "#CCCCCC" : pressed ? "#D93B7F" : "#E94B8F",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                opacity: isGenerating ? 0.6 : 1,
                transform: [{ scale: pressed && !isGenerating ? 0.97 : 1 }],
              },
            ]}
          >
            {isGenerating ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" />
                <Text className="text-white font-semibold text-base">Olusturuluyor...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">Gorsel Olustur</Text>
            )}
          </Pressable>

          {/* Info */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted leading-relaxed">
              Bu islem 30-40 saniye surebilir. Lutfen bekleyin...
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

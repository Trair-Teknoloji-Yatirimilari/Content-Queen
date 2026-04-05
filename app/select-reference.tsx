import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, FlatList, Image, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";

interface ReferencePhoto {
  id: string;
  uri: string;
}

export default function SelectReferenceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contentImageUri = params.contentImageUri as string;

  // Ornekse kayitli referans fotograflari
  const [referencePhotos] = useState<ReferencePhoto[]>([
    { id: "1", uri: "https://via.placeholder.com/300" },
    { id: "2", uri: "https://via.placeholder.com/300" },
    { id: "3", uri: "https://via.placeholder.com/300" },
  ]);

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const handleSelectPhoto = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhotoId(id);
  };

  const handleGenerate = () => {
    if (!selectedPhotoId) {
      Alert.alert("Hata", "Lutfen bir referans fotografi secin");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/generate-image",
      params: {
        contentImageUri,
        selectedPhotoId,
      },
    });
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Referans Secin</Text>
            <Text className="text-sm text-muted">
              Asagidaki fotograflardan hangisini kullanmak istiyorsunuz?
            </Text>
          </View>

          {/* Content Preview */}
          {contentImageUri && (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Icerik Referansi</Text>
              <View className="rounded-lg overflow-hidden bg-surface border border-border">
                <Image source={{ uri: contentImageUri }} className="w-full aspect-square" />
              </View>
            </View>
          )}

          {/* Reference Photos Grid */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Yuz Referansi</Text>
            <FlatList
              data={referencePhotos}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectPhoto(item.id)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <View
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedPhotoId === item.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <Image source={{ uri: item.uri }} className="w-full h-full bg-surface" />
                    {selectedPhotoId === item.id && (
                      <View className="absolute inset-0 bg-black/20 items-center justify-center">
                        <Text className="text-2xl">✓</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
            />
          </View>

          {/* Generate Button */}
          <Pressable
            onPress={handleGenerate}
            disabled={!selectedPhotoId}
            style={({ pressed }) => [
              {
                backgroundColor: selectedPhotoId ? (pressed ? "#D93B7F" : "#E94B8F") : "#CCCCCC",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed && selectedPhotoId ? 0.9 : 1,
                transform: [{ scale: pressed && selectedPhotoId ? 0.97 : 1 }],
              },
            ]}
          >
            <Text className="text-white font-semibold text-base">
              {selectedPhotoId ? "Gorsel Olustur" : "Referans Secin"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

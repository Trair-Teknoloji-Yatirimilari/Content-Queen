import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, FlatList, Image, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

interface ReferencePhoto {
  id: string;
  uri: string;
  createdAt: string;
}

export default function ReferencePhotosScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<ReferencePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
      });

      if (!result.canceled) {
        const newPhoto: ReferencePhoto = {
          id: Math.random().toString(36).substring(7),
          uri: result.assets[0].uri,
          createdAt: new Date().toISOString(),
        };
        setPhotos([...photos, newPhoto]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Hata", "Fotograf secilirken hata olustu");
    }
  };

  const deletePhoto = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleContinue = () => {
    if (photos.length === 0) {
      Alert.alert("Hata", "Lutfen en az bir referans fotografi yukleyin");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)");
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Referans Fotograflar</Text>
            <Text className="text-sm text-muted">
              Yuksek cozunurluklu, yuz hatlarinin belirgin oldugu fotograflar yukleyin
            </Text>
          </View>

          {/* Upload Button */}
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? "#D93B7F" : "#E94B8F",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text className="text-white font-semibold text-base">+ Fotograf Ekle</Text>
          </Pressable>

          {/* Photos Grid */}
          {photos.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Yuklenen Fotograflar ({photos.length})</Text>
              <FlatList
                data={photos}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <View className="flex-1 gap-2">
                    <View className="aspect-square rounded-lg overflow-hidden bg-surface border border-border">
                      <Image source={{ uri: item.uri }} className="w-full h-full" />
                    </View>
                    <Pressable
                      onPress={() => deletePhoto(item.id)}
                      style={({ pressed }) => [
                        {
                          backgroundColor: pressed ? "#FF5252" : "#FF3B30",
                          paddingVertical: 8,
                          borderRadius: 6,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text className="text-white font-semibold text-xs">Sil</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          )}

          {/* Empty State */}
          {photos.length === 0 && (
            <View className="bg-surface rounded-2xl p-8 items-center gap-3 border border-border">
              <Text className="text-4xl">📸</Text>
              <Text className="text-base font-semibold text-foreground text-center">Henuz Fotograf Yok</Text>
              <Text className="text-sm text-muted text-center">
                Yukaridan fotograf ekleyerek basla. En az bir referans fotografi gerekli.
              </Text>
            </View>
          )}

          {/* Continue Button */}
          {photos.length > 0 && (
            <Pressable
              onPress={handleContinue}
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
              <Text className="text-foreground font-semibold text-base">Devam Et</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

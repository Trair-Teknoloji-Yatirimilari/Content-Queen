import React, { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, FlatList, Image, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { photoStorage, type StoredPhoto } from "@/lib/photo-storage";

export default function ReferencePhotosScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const stored = await photoStorage.getReferencePhotos();
      setPhotos(stored);
    } catch (error) {
      console.error("Fotoğrafları yükleme hatası:", error);
    }
  };

  const pickImage = async () => {
    if (photos.length >= 10) {
      Alert.alert("Limit", "Maksimum 10 fotoğraf yükleyebilirsiniz");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsLoading(true);
        try {
          const photo = await photoStorage.saveReferencePhoto(result.assets[0].uri);
          setPhotos([...photos, photo]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          Alert.alert("Hata", "Fotoğraf kaydedilirken hata oluştu");
          console.error("Fotoğraf kaydetme hatası:", error);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      Alert.alert("Hata", "Fotoğraf seçilirken hata oluştu");
      console.error("Fotoğraf seçme hatası:", error);
    }
  };

  const deletePhoto = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await photoStorage.deleteReferencePhoto(id);
      setPhotos(photos.filter((p) => p.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Hata", "Fotoğraf silinirken hata oluştu");
      console.error("Fotoğraf silme hatası:", error);
    }
  };

  const handleContinue = () => {
    if (photos.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir referans fotoğrafı yükleyin");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)");
  };

  return (
    <ScreenContainer className="bg-background">
      <ScreenHeader title="Referans Fotoğraflar" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4 gap-6">
            <Text className="text-sm text-muted">
              Yüksek çözünürlüklü, yüz hatlarının belirgin olduğu fotoğraflar yükleyin
            </Text>
          </View>

          {/* Upload Button */}
          <Pressable
            onPress={pickImage}
            disabled={isLoading || photos.length >= 10}
            style={({ pressed }) => [
              {
                backgroundColor: photos.length >= 10 ? "#CCCCCC" : pressed ? "#D93B7F" : "#E94B8F",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                transform: [{ scale: pressed && photos.length < 10 ? 0.97 : 1 }],
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
          >
            <Text className="text-white font-semibold text-base">
              {isLoading ? "Yükleniyor..." : "+ Fotoğraf Ekle"}
            </Text>
          </Pressable>

          {/* Progress Indicator */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-foreground">İlerleme</Text>
              <Text className="text-sm text-muted">
                {photos.length} / 10
              </Text>
            </View>
            <View className="h-2 bg-surface rounded-full overflow-hidden">
              <View
                className="h-full bg-primary"
                style={{ width: `${(photos.length / 10) * 100}%` }}
              />
            </View>
          </View>

          {/* Photos Grid */}
          {photos.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">
                Yüklenen Fotoğraflar ({photos.length})
              </Text>
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
              <Text className="text-base font-semibold text-foreground text-center">
                Henüz Fotoğraf Yok
              </Text>
              <Text className="text-sm text-muted text-center">
                Yukarıdan fotoğraf ekleyerek başla. En az bir referans fotoğrafı gerekli.
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

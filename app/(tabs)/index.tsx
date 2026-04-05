import { ScrollView, Text, View, TouchableOpacity, FlatList, Image, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const [recentImages, setRecentImages] = useState<Array<{ id: string; uri: string }>>([]);
  const remainingCredit = 5; // Örnek kredi
  const subscriptionStatus = "Premium";

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to content reference upload
  };

  const handleManageReferences = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to reference photo management
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4 gap-6">
          {/* Header Section */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Content Queen</Text>
            <Text className="text-sm text-muted">Kraliçe gibi hisset</Text>
          </View>

          {/* Credit Status Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs text-muted mb-1">Kalan Kredi</Text>
                <Text className="text-2xl font-bold text-primary">{remainingCredit}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-muted mb-1">Abonelik</Text>
                <Text className="text-sm font-semibold text-foreground">{subscriptionStatus}</Text>
              </View>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={handleCreateNew}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? '#D93B7F' : '#E94B8F',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-white font-semibold text-base">+ Yeni Görsel Oluştur</Text>
            </Pressable>

            <Pressable
              onPress={handleManageReferences}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? '#E8E8E8' : '#F5F5F5',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-base">Referans Fotoğraflarım</Text>
            </Pressable>
          </View>

          {/* Recent Images Section */}
          {recentImages.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Son Oluşturulan</Text>
              <FlatList
                data={recentImages}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <View className="flex-1 aspect-square rounded-lg overflow-hidden bg-surface">
                    <Image source={{ uri: item.uri }} className="w-full h-full" />
                  </View>
                )}
              />
            </View>
          )}

          {/* Empty State */}
          {recentImages.length === 0 && (
            <View className="bg-surface rounded-2xl p-8 items-center gap-3 border border-border">
              <Text className="text-4xl">✨</Text>
              <Text className="text-base font-semibold text-foreground text-center">Henüz Görsel Yok</Text>
              <Text className="text-sm text-muted text-center">
                Yeni bir görsel oluşturmaya başla ve kraliçe gibi hisset
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

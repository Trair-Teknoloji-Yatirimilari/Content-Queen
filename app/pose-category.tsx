import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { POSE_CATEGORIES } from "@/constants/poses";

export default function PoseCategoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.id as string;

  const category = POSE_CATEGORIES.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Pozlar" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Kategori bulunamadı</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={`${category.emoji} ${category.name}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {category.poses.map((pose) => (
              <Pressable
                key={pose.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/generate-image" as any, params: { contentImageUri: pose.imageUrl, autoStart: "false" } });
                }}
                style={({ pressed }) => ({
                  width: "48%",
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.surface,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Image
                  source={{ uri: pose.imageUrl }}
                  style={{ width: "100%", height: 220 }}
                  contentFit="cover"
                  transition={300}
                />
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 13, color: "#fff", fontWeight: "700" }}>{pose.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { IMAGE_STYLES, type ImageStyle } from "@/constants/styles";
import { useI18n } from "@/lib/i18n-context";

export default function ContentReferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(IMAGE_STYLES[0]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = trpc.referencePhotos.upload.useMutation();
  const creditsQuery = trpc.credits.getCredits.useQuery();

  const remainingCredit = creditsQuery.data
    ? creditsQuery.data.totalCredits - creditsQuery.data.usedCredits
    : 0;

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let b64 = asset.base64;
        if (!b64) {
          b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        setImageUri(asset.uri);
        setImageBase64(b64 || null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf seçilirken hata oluştu");
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;

    // Kredi kontrolü
    if (remainingCredit < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("contentRef.noCredits"),
        t("contentRef.noCreditsDesc"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("contentRef.buyCredits"), onPress: () => router.push("/pricing") },
        ],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUploading(true);

    try {
      const result = await uploadMutation.mutateAsync({
        base64: imageBase64,
        photoType: "content",
        fileName: `content-${Date.now()}.jpg`,
      });
      router.push({
        pathname: "/generate-image",
        params: {
          contentImageUri: result.photoUrl,
          autoStart: "true",
          styleId: selectedStyle.id,
        },
      });
    } catch {
      Alert.alert("Hata", "Fotoğraf yüklenirken hata oluştu. Tekrar deneyin.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={t("contentRef.title")} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: imageUri ? "flex-start" : "center" }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, gap: 24, paddingTop: imageUri ? 8 : 0 }}>

          {!imageUri ? (
            /* ── Empty State ── */
            <View style={{ alignItems: "center", gap: 20 }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 28,
                  backgroundColor: "rgba(233,75,143,0.08)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 44 }}>📸</Text>
              </View>

              <View style={{ alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
                  {t("contentRef.heading")}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
                  {t("contentRef.desc")}
                </Text>
              </View>

              <Pressable
                onPress={pickImage}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 16,
                  paddingHorizontal: 48,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                })}
              >
                <Text style={{ fontSize: 18 }}>🖼</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t("contentRef.pickFromGallery")}</Text>
              </Pressable>

              {/* Tips */}
              <View style={{ width: "100%", gap: 10, marginTop: 12 }}>
                {[
                  { icon: "💡", text: t("contentRef.tip1") },
                  { icon: "🌅", text: t("contentRef.tip2") },
                  { icon: "👗", text: t("contentRef.tip3") },
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <Text style={{ fontSize: 16 }}>{tip.icon}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* ── Image Selected ── */
            <>
              {/* Image with X button */}
              <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: colors.surface }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", aspectRatio: 3 / 4 }}
                  contentFit="cover"
                  transition={300}
                />
                {/* X button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setImageUri(null);
                    setImageBase64(null);
                  }}
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -1 }}>×</Text>
                </Pressable>

                {/* Change overlay */}
                <Pressable
                  onPress={pickImage}
                  style={({ pressed }) => ({
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 12 }}>🔄</Text>
                  <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>{t("contentRef.change")}</Text>
                </Pressable>
              </View>

              {/* Style Selection */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
                  {t("contentRef.selectStyle")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {IMAGE_STYLES.map((style) => {
                    const isSelected = selectedStyle.id === style.id;
                    return (
                      <Pressable
                        key={style.id}
                        onPress={() => {
                          setSelectedStyle(style);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => ({
                          width: "31%",
                          backgroundColor: isSelected ? "rgba(233,75,143,0.1)" : colors.surface,
                          borderRadius: 14,
                          padding: 12,
                          alignItems: "center",
                          gap: 4,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        })}
                      >
                        <Text style={{ fontSize: 22 }}>{style.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: isSelected ? colors.primary : colors.foreground }}>
                          {style.name}
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.muted, textAlign: "center" }} numberOfLines={1}>
                          {style.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Generate Button */}
              <Pressable
                onPress={handleGenerate}
                disabled={isUploading}
                style={({ pressed }) => ({
                  backgroundColor: isUploading ? colors.border : pressed ? "#D93B7F" : colors.primary,
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  transform: [{ scale: pressed && !isUploading ? 0.97 : 1 }],
                  shadowColor: isUploading ? "transparent" : colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                })}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t("contentRef.uploading")}</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 20 }}>✦</Text>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t("contentRef.generate")}</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

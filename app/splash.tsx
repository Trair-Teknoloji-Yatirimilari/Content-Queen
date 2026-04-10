import React, { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useI18n, type Language } from "@/lib/i18n-context";

export default function SplashScreen() {
  const router = useRouter();
  const { t, setLanguage } = useI18n();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("tr");

  const handleLanguageSelect = async (lang: Language) => {
    setSelectedLanguage(lang);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(lang);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("kvkk" as any);
  };

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 justify-between px-6 py-12">
        {/* Logo Section */}
        <View className="items-center gap-6 mt-12">
          <View className="w-24 h-24 bg-primary rounded-full items-center justify-center">
            <Text className="text-5xl">👑</Text>
          </View>
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground text-center">
              {t("splash.welcome")}
            </Text>
            <Text className="text-base text-muted text-center">
              {t("splash.subtitle")}
            </Text>
          </View>
        </View>

        {/* Language Selection */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground text-center">
            {t("splash.selectLanguage")}
          </Text>

          <View className="gap-3">
            {/* Turkish */}
            <Pressable
              onPress={() => handleLanguageSelect("tr")}
              style={({ pressed }) => [
                {
                  backgroundColor:
                    selectedLanguage === "tr" ? "#E94B8F" : "#F5F5F5",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor:
                    selectedLanguage === "tr" ? "#E94B8F" : "#E5E7EB",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                className={`font-semibold text-base ${
                  selectedLanguage === "tr" ? "text-white" : "text-foreground"
                }`}
              >
                🇹🇷 {t("splash.turkish")}
              </Text>
            </Pressable>

            {/* English */}
            <Pressable
              onPress={() => handleLanguageSelect("en")}
              style={({ pressed }) => [
                {
                  backgroundColor:
                    selectedLanguage === "en" ? "#E94B8F" : "#F5F5F5",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor:
                    selectedLanguage === "en" ? "#E94B8F" : "#E5E7EB",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                className={`font-semibold text-base ${
                  selectedLanguage === "en" ? "text-white" : "text-foreground"
                }`}
              >
                🇬🇧 {t("splash.english")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Next Button */}
        <Pressable
          onPress={handleNext}
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
          <Text className="text-white font-semibold text-base">
            {t("splash.next")}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

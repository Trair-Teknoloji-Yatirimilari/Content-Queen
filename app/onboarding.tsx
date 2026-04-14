import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useI18n } from "@/lib/i18n-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    { emoji: "⚡", title: "Hızlı Görsel Oluştur", subtitle: "Beğendiğin pozu seç, selfie yükle.\nAI saniyeler içinde seni o pozda oluşturur.", bgColor: "rgba(233,75,143,0.08)" },
    { emoji: "🧠", title: "LoRA ile Kişiselleştir", subtitle: "AI modelini eğit, daha kişisel\nve profesyonel görseller üret.", bgColor: "rgba(52,199,89,0.08)" },
    { emoji: "📱", title: "Paylaş ve Parla", subtitle: "Görselleri kaydet, Instagram'da paylaş.\nSosyal medyada fark yarat.", bgColor: "rgba(255,149,0,0.08)" },
  ];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem("cq_onboarding_done", "true");
    await AsyncStorage.setItem("cq_onboarding_version", "1.0.0");
    router.replace("/login");
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        gap: 24,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 32,
          backgroundColor: item.bgColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
      </View>
      <Text
        style={{
          fontSize: 26,
          fontWeight: "800",
          color: colors.foreground,
          textAlign: "center",
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.muted,
          textAlign: "center",
          lineHeight: 24,
        }}
      >
        {item.subtitle}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        {/* Skip */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={handleSkip} style={{ padding: 8 }}>
            <Text style={{ fontSize: 15, color: colors.muted, fontWeight: "600" }}>{t("onboarding.skip")}</Text>
          </Pressable>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={{ flex: 1 }}
        />

        {/* Bottom */}
        <View style={{ paddingHorizontal: 28, paddingBottom: 32, gap: 20 }}>
          {/* Dots */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: currentIndex === i ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: currentIndex === i ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {/* Button */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#D93B7F" : colors.primary,
              paddingVertical: 18,
              borderRadius: 16,
              alignItems: "center",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              {currentIndex === slides.length - 1 ? t("onboarding.start") : t("onboarding.next")}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

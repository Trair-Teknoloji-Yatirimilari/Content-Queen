import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "@/lib/i18n-context";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onPress: () => void;
}

function Checkbox({ label, checked, onPress }: CheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
        },
      ]}
    >
      <View
        className={`w-6 h-6 rounded border-2 items-center justify-center ${
          checked ? "bg-primary border-primary" : "border-border"
        }`}
      >
        {checked && <Text className="text-white font-bold text-sm">✓</Text>}
      </View>
      <Text className="flex-1 text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}

export default function KVKKScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeData, setAgreeData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgree = async () => {
    if (!agreePrivacy || !agreeTerms || !agreeData) {
      Alert.alert(t("common.error"), t("kvkk.required"));
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await AsyncStorage.setItem("content_queen_kvkk_accepted", "true");
      await AsyncStorage.setItem("content_queen_kvkk_date", new Date().toISOString());
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(t("common.error"), "KVKK kaydedilirken hata oluştu");
      console.error("KVKK kaydetme hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisagree = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Uygulamayı Kullanamayız",
      "Devam etmek için tüm şartları kabul etmelisiniz.",
      [
        {
          text: "Geri Dön",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">
              {t("kvkk.title")}
            </Text>
            <Text className="text-sm text-muted">{t("kvkk.description")}</Text>
          </View>

          {/* Privacy Policy Section */}
          <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
            <Text className="font-semibold text-foreground">
              {t("kvkk.privacy")}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              Content Queen, kişisel verilerinizi korumak için endüstri standardı
              şifreleme kullanır. Fotoğraflarınız sunucularımızda güvenli bir şekilde
              saklanır ve hiçbir zaman üçüncü taraflarla paylaşılmaz. Ayrıntılı
              bilgi için lütfen gizlilik politikamızı okuyun.
            </Text>
          </View>

          {/* Terms of Service Section */}
          <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
            <Text className="font-semibold text-foreground">
              {t("kvkk.terms")}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              Content Queen'i kullanarak, uygulamayı yalnızca yasal amaçlar için
              kullanacağınızı kabul edersiniz. Telif hakkı ihlali, ticari amaçlı
              kötüye kullanım veya yasadışı aktiviteler yasaktır. Ayrıntılı
              şartlar için lütfen kullanım şartlarımızı okuyun.
            </Text>
          </View>

          {/* Checkboxes */}
          <View className="gap-4">
            <Checkbox
              label={t("kvkk.privacy")}
              checked={agreePrivacy}
              onPress={() => setAgreePrivacy(!agreePrivacy)}
            />
            <Checkbox
              label={t("kvkk.terms")}
              checked={agreeTerms}
              onPress={() => setAgreeTerms(!agreeTerms)}
            />
            <Checkbox
              label={t("kvkk.dataProcessing")}
              checked={agreeData}
              onPress={() => setAgreeData(!agreeData)}
            />
          </View>

          {/* Info Box */}
          <View className="bg-primary/10 rounded-lg p-4 gap-2 border border-primary/20">
            <Text className="text-xs font-semibold text-primary">
              ℹ️ Bilgilendirme
            </Text>
            <Text className="text-xs text-foreground leading-relaxed">
              Bu şartları kabul ederek, Content Queen'in verilerinizi işleme
              şartlarını onaylamış olursunuz. İstediğiniz zaman ayarlardan
              onayınızı geri çekebilirsiniz.
            </Text>
          </View>

          {/* Buttons */}
          <View className="gap-3 mt-4">
            <Pressable
              onPress={handleAgree}
              disabled={isLoading}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#D93B7F" : "#E94B8F",
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
            >
              <Text className="text-white font-semibold text-base">
                {isLoading ? t("common.loading") : t("kvkk.agree")}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDisagree}
              disabled={isLoading}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#F5F5F5",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-base">
                {t("splash.disagree")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

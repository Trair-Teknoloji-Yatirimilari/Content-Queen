import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setIsSubmitting(true);
      await signIn("user@apple.com", "Apple User");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Hata", "Apple ile giris basarisiz oldu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGmailSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setIsSubmitting(true);
      await signIn("user@gmail.com", "Gmail User");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Hata", "Gmail ile giris basarisiz oldu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !name) {
      Alert.alert("Hata", "Lutfen email ve adinizi girin");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setIsSubmitting(true);
      await signIn(email, name);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Hata", "Giris basarisiz oldu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#E94B8F" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8 gap-8 flex-1 justify-center">
          {/* Header */}
          <View className="gap-2 items-center">
            <Text className="text-4xl font-bold text-foreground">Content Queen</Text>
            <Text className="text-base text-muted text-center">Kralice gibi hisset</Text>
          </View>

          {/* Subtitle */}
          <View className="gap-2">
            <Text className="text-xl font-semibold text-foreground text-center">Hos Geldin</Text>
            <Text className="text-sm text-muted text-center">
              Hizlica giris yap ve hayalindeki gorselleri olusturmaya basla
            </Text>
          </View>

          {/* Social Sign In Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={handleAppleSignIn}
              disabled={isSubmitting}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#000000" : "#000000",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: isSubmitting ? 0.6 : 1,
                  transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-white font-semibold text-base">Apple ID ile Giris</Text>
            </Pressable>

            <Pressable
              onPress={handleGmailSignIn}
              disabled={isSubmitting}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#F0F0F0" : "#FFFFFF",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  opacity: isSubmitting ? 0.6 : 1,
                  transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-base">Gmail ile Giris</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-xs text-muted">VEYA</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Email Sign In Form */}
          <View className="gap-3">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Adin</Text>
              <TextInput
                placeholder="Adini gir"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999999"
                editable={!isSubmitting}
                style={{
                  backgroundColor: "#F5F5F5",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: "#000000",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Email</Text>
              <TextInput
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999999"
                editable={!isSubmitting}
                style={{
                  backgroundColor: "#F5F5F5",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: "#000000",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              />
            </View>

            <Pressable
              onPress={handleEmailSignIn}
              disabled={isSubmitting}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "#D93B7F" : "#E94B8F",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: isSubmitting ? 0.6 : 1,
                  transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">Giris Yap</Text>
              )}
            </Pressable>
          </View>

          {/* Terms */}
          <Text className="text-xs text-muted text-center leading-relaxed">
            Giris yaparak, Hizmet Sartlarimizi ve Gizlilik Politikamizi kabul etmis olursunuz.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

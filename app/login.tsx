import React, { useState, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";

type Step = "phone" | "otp";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const sendOtpMutation = trpc.auth.sendOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError("Geçerli bir telefon numarası girin");
      return;
    }
    if (!termsAccepted) {
      setError("Devam etmek için sözleşmeleri kabul etmelisiniz");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await sendOtpMutation.mutateAsync({ phone });
      if (result.success) {
        setStep("otp");
        startCountdown();
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      } else {
        setError(result.error || "SMS gönderilemedi");
      }
    } catch (e) {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Paste handling
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const submitOtp = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await verifyOtpMutation.mutateAsync({ phone, code });
      if (result.success && result.sessionToken && result.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setSession(result.sessionToken, result.user);
        // Layout useEffect handles navigation based on isSignedIn
      } else {
        setError(result.error || "Doğrulama başarısız");
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError("Bir hata oluştu. Tekrar deneyin.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 28, gap: 32 }}>
            {/* Logo */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: colors.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 32, color: "#fff" }}>👑</Text>
              </View>
              <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
                Content Queen
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted }}>
                Kraliçe gibi parla ✨
              </Text>
            </View>

            {step === "phone" ? (
              /* ── Phone Step ── */
              <View style={{ gap: 20 }}>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    Telefon Numarası
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: error ? colors.error : colors.border,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.muted, marginRight: 8 }}>
                      +90
                    </Text>
                    <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginRight: 12 }} />
                    <TextInput
                      placeholder="5XX XXX XX XX"
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t.replace(/\D/g, ""));
                        setError(null);
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholderTextColor={colors.muted}
                      editable={!isSubmitting}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: colors.foreground,
                        paddingVertical: 16,
                      }}
                    />
                  </View>
                </View>

                {error && (
                  <Text style={{ fontSize: 13, color: colors.error, textAlign: "center" }}>
                    {error}
                  </Text>
                )}

                <Pressable
                  onPress={handleSendOtp}
                  disabled={isSubmitting || phone.length < 10 || !termsAccepted}
                  style={({ pressed }) => ({
                    backgroundColor:
                      isSubmitting || phone.length < 10 || !termsAccepted
                        ? colors.border
                        : pressed
                          ? "#D93B7F"
                          : colors.primary,
                    paddingVertical: 16,
                    borderRadius: 14,
                    alignItems: "center",
                    transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                  })}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                      Doğrulama Kodu Gönder
                    </Text>
                  )}
                </Pressable>

                {/* Terms Checkbox */}
                <Pressable
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 4 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: termsAccepted ? colors.primary : colors.border,
                      backgroundColor: termsAccepted ? colors.primary : "transparent",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: 1,
                    }}
                  >
                    {termsAccepted && (
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✓</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                      <Text
                        style={{ color: colors.primary, fontWeight: "600" }}
                        onPress={() => router.push("/privacy-policy")}
                      >
                        Gizlilik Politikası
                      </Text>
                      {"'nı ve "}
                      <Text
                        style={{ color: colors.primary, fontWeight: "600" }}
                        onPress={() => router.push("/terms-of-service")}
                      >
                        Kullanım Şartları
                      </Text>
                      {"'nı okudum ve kabul ediyorum."}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              /* ── OTP Step ── */
              <View style={{ gap: 20 }}>
                <View style={{ alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    Doğrulama Kodu
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                    +90 {phone} numarasına gönderildi
                  </Text>
                </View>

                {/* OTP Inputs */}
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!isSubmitting}
                      style={{
                        width: 48,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: colors.surface,
                        borderWidth: 2,
                        borderColor: digit ? colors.primary : colors.border,
                        textAlign: "center",
                        fontSize: 22,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    />
                  ))}
                </View>

                {error && (
                  <Text style={{ fontSize: 13, color: colors.error, textAlign: "center" }}>
                    {error}
                  </Text>
                )}

                {/* Verify Button */}
                <Pressable
                  onPress={() => submitOtp(otp.join(""))}
                  disabled={isSubmitting || otp.some((d) => d === "")}
                  style={({ pressed }) => ({
                    backgroundColor:
                      isSubmitting || otp.some((d) => d === "")
                        ? colors.border
                        : pressed
                          ? "#D93B7F"
                          : colors.primary,
                    paddingVertical: 16,
                    borderRadius: 14,
                    alignItems: "center",
                    transform: [{ scale: pressed && !isSubmitting ? 0.97 : 1 }],
                  })}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                      Doğrula
                    </Text>
                  )}
                </Pressable>

                {/* Resend */}
                <View style={{ alignItems: "center", gap: 12 }}>
                  {countdown > 0 ? (
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      Tekrar gönder ({countdown}s)
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendOtp}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
                        Kodu Tekrar Gönder
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => {
                      setStep("phone");
                      setOtp(["", "", "", "", "", ""]);
                      setError(null);
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      Numarayı Değiştir
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Footer */}
            <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 18 }}>
              TrairX Technology O.Ü. — Estonya
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

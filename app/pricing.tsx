import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";

type Tab = "credits" | "subscription";

interface CreditPackage {
  id: string;
  credits: number;
  price: string;
  pricePerCredit: string;
  popular?: boolean;
  savings?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  credits: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits_10", credits: 10, price: "$2.99", pricePerCredit: "$0.30" },
  { id: "credits_50", credits: 50, price: "$9.99", pricePerCredit: "$0.20", popular: true, savings: "%33 tasarruf" },
  { id: "credits_150", credits: 150, price: "$19.99", pricePerCredit: "$0.13", savings: "%56 tasarruf" },
];

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub_basic",
    name: "Basic",
    price: "$4.99",
    period: "/ay",
    credits: "30 kredi/ay",
    features: ["30 görsel/ay", "Standart kalite", "E-posta destek"],
  },
  {
    id: "sub_pro",
    name: "Pro",
    price: "$9.99",
    period: "/ay",
    credits: "100 kredi/ay",
    popular: true,
    features: ["100 görsel/ay", "Yüksek kalite", "Öncelikli işlem", "7/24 destek"],
  },
  {
    id: "sub_premium",
    name: "Premium",
    price: "$19.99",
    period: "/ay",
    credits: "Sınırsız",
    features: ["Sınırsız görsel", "En yüksek kalite", "Öncelikli işlem", "Özel destek", "Erken erişim"],
  },
];

export default function PricingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("credits");
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const creditsQuery = trpc.credits.getCredits.useQuery();
  const addCreditsMutation = trpc.credits.addCredits.useMutation();
  const utils = trpc.useUtils();

  const remainingCredit = creditsQuery.data
    ? creditsQuery.data.totalCredits - creditsQuery.data.usedCredits
    : 0;

  const handlePurchaseCredits = async (pkg: CreditPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(pkg.id);

    try {
      // TODO: RevenueCat ile gerçek ödeme
      // Şimdilik direkt kredi ekle (test amaçlı)
      await addCreditsMutation.mutateAsync({ amount: pkg.credits });
      utils.credits.getCredits.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Başarılı ✅", `${pkg.credits} kredi hesabınıza eklendi.`);
    } catch {
      Alert.alert("Hata", "Satın alma işlemi başarısız.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: RevenueCat ile gerçek abonelik
    Alert.alert("Yakında", `${plan.name} aboneliği yakında aktif olacak.`);
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Paketler" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, gap: 20 }}>

          {/* Current Credits */}
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Mevcut Kredin</Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>{remainingCredit}</Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>💎</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Pressable
              onPress={() => { setTab("credits"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tab === "credits" ? "#fff" : "transparent",
                shadowColor: tab === "credits" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: tab === "credits" ? 0.1 : 0,
                shadowRadius: 3,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: tab === "credits" ? colors.foreground : colors.muted }}>
                Kredi Paketleri
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setTab("subscription"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tab === "subscription" ? "#fff" : "transparent",
                shadowColor: tab === "subscription" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: tab === "subscription" ? 0.1 : 0,
                shadowRadius: 3,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: tab === "subscription" ? colors.foreground : colors.muted }}>
                Abonelik
              </Text>
            </Pressable>
          </View>

          {/* Credit Packages */}
          {tab === "credits" && (
            <View style={{ gap: 12 }}>
              {CREDIT_PACKAGES.map((pkg) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handlePurchaseCredits(pkg)}
                  disabled={purchasing !== null}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: pkg.popular ? 2 : 1,
                    borderColor: pkg.popular ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {pkg.popular && (
                    <View
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 16,
                        backgroundColor: colors.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>EN POPÜLER</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
                          {pkg.credits}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.muted }}>kredi</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        Kredi başına {pkg.pricePerCredit}
                      </Text>
                      {pkg.savings && (
                        <View style={{ backgroundColor: "rgba(52,199,89,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>{pkg.savings}</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ alignItems: "center", gap: 4 }}>
                      {purchasing === pkg.id ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <View
                          style={{
                            backgroundColor: pkg.popular ? colors.primary : colors.foreground,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{pkg.price}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}

              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Krediler süresiz geçerlidir. Her görsel oluşturma 1 kredi harcar.
              </Text>
            </View>
          )}

          {/* Subscription Plans */}
          {tab === "subscription" && (
            <View style={{ gap: 12 }}>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <Pressable
                  key={plan.id}
                  onPress={() => handleSubscribe(plan)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: plan.popular ? 2 : 1,
                    borderColor: plan.popular ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    gap: 14,
                  })}
                >
                  {plan.popular && (
                    <View
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 16,
                        backgroundColor: colors.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>ÖNERİLEN</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>{plan.name}</Text>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>{plan.credits}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>{plan.price}</Text>
                        <Text style={{ fontSize: 13, color: colors.muted }}>{plan.period}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: 6 }}>
                    {plan.features.map((feature, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 12, color: colors.success }}>✓</Text>
                        <Text style={{ fontSize: 13, color: colors.foreground }}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{
                      backgroundColor: plan.popular ? colors.primary : colors.foreground,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Abone Ol</Text>
                  </View>
                </Pressable>
              ))}

              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.{"\n"}
                Kullanılmayan krediler bir sonraki aya devretmez.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

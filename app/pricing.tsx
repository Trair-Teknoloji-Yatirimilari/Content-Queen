import React, { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  CREDIT_AMOUNTS,
} from "@/lib/purchases";
import type { PurchasesPackage } from "react-native-purchases";
import { useI18n } from "@/lib/i18n-context";

type Tab = "credits" | "subscription";

// Fallback data when RevenueCat is unavailable (Expo Go)
const FALLBACK_CREDITS = [
  { id: "credits_10", credits: 10, price: "$2.99", pricePerCredit: "$0.30" },
  { id: "credits_50", credits: 50, price: "$9.99", pricePerCredit: "$0.20", popular: true, savings: "%33" },
  { id: "credits_150", credits: 150, price: "$19.99", pricePerCredit: "$0.13", savings: "%56" },
];

const FALLBACK_SUBS = [
  {
    id: "sub_basic",
    name: "Basic",
    price: "$4.99",
    period: "/ay",
    credits: "12 kredi/ay",
    features: [
      "Ayda 12 hızlı görsel oluşturma",
      "Face Swap ile yüz benzerliği",
      "CodeFormer ile yüz netleştirme",
      "2x yüksek çözünürlük",
      "Galeriye kaydetme ve paylaşma",
    ],
  },
  {
    id: "sub_pro",
    name: "Pro",
    price: "$9.99",
    period: "/ay",
    credits: "35 kredi/ay",
    popular: true,
    features: [
      "Ayda 35 görsel oluşturma",
      "⚡ Hızlı Oluştur (1 kredi)",
      "🧠 LoRA ile Yap (5 kredi)",
      "Kişiye özel AI model eğitimi",
      "Face Swap + CodeFormer pipeline",
      "Instagram Stories direkt paylaşım",
      "Öncelikli işlem sırası",
    ],
  },
  {
    id: "sub_premium",
    name: "Premium",
    price: "$19.99",
    period: "/ay",
    credits: "100 kredi/ay",
    features: [
      "Ayda 100 görsel oluşturma",
      "⚡ Hızlı Oluştur (1 kredi)",
      "🧠 LoRA ile Yap (5 kredi)",
      "Kişiye özel AI model eğitimi",
      "Face Swap + CodeFormer pipeline",
      "Instagram Stories direkt paylaşım",
      "Öncelikli işlem sırası",
      "E-posta ile öncelikli destek",
    ],
  },
];

export default function PricingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("credits");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [creditPackages, setCreditPackages] = useState<PurchasesPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<PurchasesPackage[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [usesFallback, setUsesFallback] = useState(false);

  const creditsQuery = trpc.credits.getCredits.useQuery();
  const addCreditsMutation = trpc.credits.addCredits.useMutation();
  const utils = trpc.useUtils();

  const remainingCredit = creditsQuery.data
    ? creditsQuery.data.totalCredits - creditsQuery.data.usedCredits
    : 0;

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      console.log("[Pricing] Offerings loaded:", offerings.creditPackages.length, "credits,", offerings.subscriptions.length, "subs");
      setCreditPackages(offerings.creditPackages);
      setSubscriptions(offerings.subscriptions);
      if (offerings.creditPackages.length === 0 && offerings.subscriptions.length === 0) {
        console.warn("[Pricing] No offerings found — fallback mode");
        // Production'da fallback'i sadece göster, satın alma devre dışı
        setUsesFallback(true);
      }
    } catch (e) {
      console.error("[Pricing] Load offerings error:", e);
      setUsesFallback(true);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(pkg.identifier);

    try {
      const result = await purchasePackage(pkg);

      if (result.success) {
        // Kredi paketi ise backend'e kredi ekle
        const productId = pkg.product.identifier;
        const creditAmount = CREDIT_AMOUNTS[productId];
        console.log("[Pricing] Purchase success:", productId, "credits:", creditAmount);
        if (creditAmount) {
          const tier = productId === "sub_premium" ? "premium"
            : productId === "sub_pro" ? "pro"
            : productId === "sub_basic" ? "pro"
            : undefined;
          await addCreditsMutation.mutateAsync({
            amount: creditAmount,
            ...(tier ? { subscriptionTier: tier as "free" | "pro" | "premium" } : {}),
          });
          utils.credits.getCredits.invalidate();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Başarılı ✅", creditAmount
          ? `${creditAmount} kredi hesabınıza eklendi.`
          : "Aboneliğiniz aktif edildi."
        );
      } else if (result.error !== "cancelled") {
        Alert.alert("Hata", result.error || "Satın alma başarısız.");
      }
    } catch {
      Alert.alert("Hata", "Satın alma işlemi başarısız.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleFallbackPurchase = async (id: string, credits: number) => {
    // Production'da fallback satın alma devre dışı — RevenueCat gerekli
    Alert.alert(
      "Satın Alma Hazırlanıyor",
      "Satın alma sistemi yükleniyor. Lütfen uygulamayı kapatıp tekrar açın.",
    );
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const info = await restorePurchases();
    if (info && Object.keys(info.entitlements.active).length > 0) {
      Alert.alert("Başarılı ✅", "Satın almalarınız geri yüklendi.");
    } else {
      Alert.alert("Bilgi", "Geri yüklenecek satın alma bulunamadı.");
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={t("pricing.title")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, gap: 20 }}>

          {/* Current Credits */}
          <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{t("pricing.currentCredits")}</Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>{remainingCredit}</Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>💎</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
            {(["credits", "subscription"] as Tab[]).map((tabKey) => (
              <Pressable
                key={tabKey}
                onPress={() => { setTab(tabKey); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                  backgroundColor: tab === tabKey ? colors.background : "transparent",
                  shadowColor: tab === tabKey ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 }, shadowOpacity: tab === tabKey ? 0.1 : 0, shadowRadius: 3,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: tab === tabKey ? colors.foreground : colors.muted }}>
                  {tabKey === "credits" ? t("pricing.creditPacks") : t("pricing.subscription")}
                </Text>
              </Pressable>
            ))}
          </View>

          {loadingOfferings && (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Credit Packages */}
          {!loadingOfferings && tab === "credits" && (
            <View style={{ gap: 12 }}>
              {(usesFallback ? FALLBACK_CREDITS : creditPackages.map((p) => ({
                id: p.product.identifier,
                credits: CREDIT_AMOUNTS[p.product.identifier] || 0,
                price: p.product.priceString,
                pricePerCredit: `$${((p.product.price || 0) / (CREDIT_AMOUNTS[p.product.identifier] || 1)).toFixed(2)}`,
                popular: p.product.identifier === "credits_50",
                savings: p.product.identifier === "credits_50" ? "%33" : p.product.identifier === "credits_150" ? "%56" : undefined,
                pkg: p,
              }))).map((item: any) => (
                <Pressable
                  key={item.id}
                  onPress={() => item.pkg ? handlePurchase(item.pkg) : handleFallbackPurchase(item.id, item.credits)}
                  disabled={purchasing !== null}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
                    borderWidth: item.popular ? 2 : 1, borderColor: item.popular ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {item.popular && (
                    <View style={{ position: "absolute", top: -10, right: 16, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{t("pricing.mostPopular")}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>{item.credits}</Text>
                        <Text style={{ fontSize: 14, color: colors.muted }}>{t("pricing.credits")}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{t("pricing.perCredit")} {item.pricePerCredit}</Text>
                      {item.savings && (
                        <View style={{ backgroundColor: "rgba(52,199,89,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>{item.savings} {t("pricing.savings")}</Text>
                        </View>
                      )}
                    </View>
                    {purchasing === item.id ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={{ backgroundColor: item.popular ? colors.primary : colors.surface, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: item.popular ? 0 : 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: item.popular ? "#fff" : colors.foreground }}>{item.price}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Krediler süresiz geçerlidir. Hızlı oluşturma 1 kredi, LoRA ile oluşturma 5 kredi harcar.{"\n"}
                Ödeme, satın alma onaylandığında Apple ID hesabınızdan tahsil edilir.
              </Text>
            </View>
          )}

          {/* Subscriptions */}
          {!loadingOfferings && tab === "subscription" && (
            <View style={{ gap: 12 }}>
              {(usesFallback ? FALLBACK_SUBS : subscriptions.map((p) => ({
                id: p.product.identifier,
                name: p.product.identifier === "sub_basic" ? "Basic" : p.product.identifier === "sub_pro" ? "Pro" : "Premium",
                price: p.product.priceString,
                period: "/ay",
                credits: p.product.identifier === "sub_basic" ? "12 kredi/ay" : p.product.identifier === "sub_pro" ? "35 kredi/ay" : "100 kredi/ay",
                popular: p.product.identifier === "sub_pro",
                features: p.product.identifier === "sub_basic"
                  ? [
                      "Ayda 12 hızlı görsel oluşturma",
                      "Face Swap ile yüz benzerliği",
                      "CodeFormer ile yüz netleştirme",
                      "2x yüksek çözünürlük",
                      "Galeriye kaydetme ve paylaşma",
                    ]
                  : p.product.identifier === "sub_pro"
                    ? [
                        "Ayda 35 görsel oluşturma",
                        "⚡ Hızlı Oluştur (1 kredi)",
                        "🧠 LoRA ile Yap (5 kredi)",
                        "Kişiye özel AI model eğitimi",
                        "Face Swap + CodeFormer pipeline",
                        "Instagram Stories direkt paylaşım",
                        "Öncelikli işlem sırası",
                      ]
                    : [
                        "Ayda 100 görsel oluşturma",
                        "⚡ Hızlı Oluştur (1 kredi)",
                        "🧠 LoRA ile Yap (5 kredi)",
                        "Kişiye özel AI model eğitimi",
                        "Face Swap + CodeFormer pipeline",
                        "Instagram Stories direkt paylaşım",
                        "Öncelikli işlem sırası",
                        "E-posta ile öncelikli destek",
                      ],
                pkg: p,
              }))).map((plan: any) => {
                const currentTier = creditsQuery.data?.subscriptionTier ?? "free";
                const planTier = plan.id === "sub_basic" ? "pro" : plan.id === "sub_pro" ? "pro" : "premium";
                const isCurrentPlan = (plan.id === "sub_basic" && currentTier === "pro") ||
                  (plan.id === "sub_pro" && currentTier === "pro") ||
                  (plan.id === "sub_premium" && currentTier === "premium");

                return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    if (isCurrentPlan) return;
                    plan.pkg ? handlePurchase(plan.pkg) : Alert.alert("Yakında", "Abonelik yakında aktif olacak.");
                  }}
                  disabled={isCurrentPlan}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
                    borderWidth: plan.popular ? 2 : 1, borderColor: plan.popular ? colors.primary : colors.border,
                    opacity: isCurrentPlan ? 0.7 : pressed ? 0.9 : 1, transform: [{ scale: pressed && !isCurrentPlan ? 0.98 : 1 }], gap: 14,
                  })}
                >
                  {isCurrentPlan && (
                    <View style={{ position: "absolute", top: -10, left: 16, backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>Mevcut Plan</Text>
                    </View>
                  )}
                  {plan.popular && !isCurrentPlan && (
                    <View style={{ position: "absolute", top: -10, right: 16, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{t("pricing.recommended")}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>{plan.name}</Text>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>{plan.credits}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>{plan.price}</Text>
                      <Text style={{ fontSize: 13, color: colors.muted }}>{plan.period}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    {plan.features.map((f: string, i: number) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 12, color: colors.success }}>✓</Text>
                        <Text style={{ fontSize: 13, color: colors.foreground }}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ backgroundColor: isCurrentPlan ? colors.border : plan.popular ? colors.primary : colors.surface, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: (plan.popular || isCurrentPlan) ? 0 : 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: isCurrentPlan ? colors.muted : plan.popular ? "#fff" : colors.foreground }}>
                      {isCurrentPlan ? "Aktif Plan ✓" : t("pricing.subscribe")}
                    </Text>
                  </View>
                </Pressable>
              );
              })}

              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.
              </Text>

              {/* Apple Required Subscription Disclosures */}
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8, marginTop: 4, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.foreground }}>{t("pricing.subsDetails")}</Text>
                <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 17 }}>
                  • Ödeme, satın alma onaylandığında Apple ID hesabınızdan tahsil edilir.{"\n"}
                  • Abonelik, mevcut dönemin bitiminden en az 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir.{"\n"}
                  • Yenileme ücreti, mevcut dönemin bitiminden önceki 24 saat içinde hesabınızdan tahsil edilir.{"\n"}
                  • Aboneliğinizi satın alma sonrasında Ayarlar → Apple ID → Abonelikler bölümünden yönetebilir ve iptal edebilirsiniz.{"\n"}
                  • Ücretsiz deneme süresi sunulması halinde, kullanılmayan kısım abonelik satın alındığında geçerliliğini yitirir.
                </Text>
              </View>
            </View>
          )}

          {/* Restore */}
          <Pressable onPress={handleRestore} style={{ alignItems: "center", padding: 12 }}>
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>{t("pricing.restore")}</Text>
          </Pressable>

          {/* Legal Links — Apple Required */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, paddingBottom: 8 }}>
            <Pressable onPress={() => router.push("/terms-of-service")}>
              <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: "underline" }}>{t("settings.terms")}</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/privacy-policy")}>
              <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: "underline" }}>{t("settings.privacy")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

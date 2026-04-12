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

type Tab = "credits" | "subscription";

// Fallback data when RevenueCat is unavailable (Expo Go)
const FALLBACK_CREDITS = [
  { id: "credits_10", credits: 10, price: "$2.99", pricePerCredit: "$0.30" },
  { id: "credits_50", credits: 50, price: "$9.99", pricePerCredit: "$0.20", popular: true, savings: "%33" },
  { id: "credits_150", credits: 150, price: "$19.99", pricePerCredit: "$0.13", savings: "%56" },
];

const FALLBACK_SUBS = [
  { id: "sub_basic", name: "Basic", price: "$4.99", period: "/ay", credits: "30 kredi/ay", features: ["30 görsel/ay", "Standart kalite", "E-posta destek"] },
  { id: "sub_pro", name: "Pro", price: "$9.99", period: "/ay", credits: "100 kredi/ay", popular: true, features: ["100 görsel/ay", "Yüksek kalite", "Öncelikli işlem", "7/24 destek"] },
  { id: "sub_premium", name: "Premium", price: "$19.99", period: "/ay", credits: "Sınırsız", features: ["Sınırsız görsel", "En yüksek kalite", "Öncelikli işlem", "Özel destek", "Erken erişim"] },
];

export default function PricingScreen() {
  const colors = useColors();
  const router = useRouter();
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
      setCreditPackages(offerings.creditPackages);
      setSubscriptions(offerings.subscriptions);
      if (offerings.creditPackages.length === 0 && offerings.subscriptions.length === 0) {
        setUsesFallback(true);
      }
    } catch {
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
        const creditAmount = CREDIT_AMOUNTS[pkg.identifier];
        if (creditAmount) {
          await addCreditsMutation.mutateAsync({ amount: creditAmount });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(id);
    try {
      await addCreditsMutation.mutateAsync({ amount: credits });
      utils.credits.getCredits.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Başarılı ✅", `${credits} kredi hesabınıza eklendi.`);
    } catch {
      Alert.alert("Hata", "İşlem başarısız.");
    } finally {
      setPurchasing(null);
    }
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
      <ScreenHeader title="Paketler" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, gap: 20 }}>

          {/* Current Credits */}
          <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Mevcut Kredin</Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>{remainingCredit}</Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>💎</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
            {(["credits", "subscription"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => { setTab(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                  backgroundColor: tab === t ? "#fff" : "transparent",
                  shadowColor: tab === t ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 }, shadowOpacity: tab === t ? 0.1 : 0, shadowRadius: 3,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: tab === t ? colors.foreground : colors.muted }}>
                  {t === "credits" ? "Kredi Paketleri" : "Abonelik"}
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
                id: p.identifier,
                credits: CREDIT_AMOUNTS[p.identifier] || 0,
                price: p.product.priceString,
                pricePerCredit: `$${((p.product.price || 0) / (CREDIT_AMOUNTS[p.identifier] || 1)).toFixed(2)}`,
                popular: p.identifier === "credits_50",
                savings: p.identifier === "credits_50" ? "%33" : p.identifier === "credits_150" ? "%56" : undefined,
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
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>EN POPÜLER</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>{item.credits}</Text>
                        <Text style={{ fontSize: 14, color: colors.muted }}>kredi</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Kredi başına {item.pricePerCredit}</Text>
                      {item.savings && (
                        <View style={{ backgroundColor: "rgba(52,199,89,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>{item.savings} tasarruf</Text>
                        </View>
                      )}
                    </View>
                    {purchasing === item.id ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={{ backgroundColor: item.popular ? colors.primary : colors.foreground, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{item.price}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Krediler süresiz geçerlidir. Her görsel oluşturma 1 kredi harcar.{"\n"}
                Ödeme, satın alma onaylandığında Apple ID hesabınızdan tahsil edilir.
              </Text>
            </View>
          )}

          {/* Subscriptions */}
          {!loadingOfferings && tab === "subscription" && (
            <View style={{ gap: 12 }}>
              {(usesFallback ? FALLBACK_SUBS : subscriptions.map((p) => ({
                id: p.identifier,
                name: p.identifier === "sub_basic" ? "Basic" : p.identifier === "sub_pro" ? "Pro" : "Premium",
                price: p.product.priceString,
                period: "/ay",
                credits: p.identifier === "sub_basic" ? "30 kredi/ay" : p.identifier === "sub_pro" ? "100 kredi/ay" : "Sınırsız",
                popular: p.identifier === "sub_pro",
                features: p.identifier === "sub_basic"
                  ? ["30 görsel/ay", "Standart kalite", "E-posta destek"]
                  : p.identifier === "sub_pro"
                    ? ["100 görsel/ay", "Yüksek kalite", "Öncelikli işlem", "7/24 destek"]
                    : ["Sınırsız görsel", "En yüksek kalite", "Öncelikli işlem", "Özel destek", "Erken erişim"],
                pkg: p,
              }))).map((plan: any) => (
                <Pressable
                  key={plan.id}
                  onPress={() => plan.pkg ? handlePurchase(plan.pkg) : Alert.alert("Yakında", "Abonelik yakında aktif olacak.")}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
                    borderWidth: plan.popular ? 2 : 1, borderColor: plan.popular ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], gap: 14,
                  })}
                >
                  {plan.popular && (
                    <View style={{ position: "absolute", top: -10, right: 16, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>ÖNERİLEN</Text>
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
                  <View style={{ backgroundColor: plan.popular ? colors.primary : colors.foreground, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Abone Ol</Text>
                  </View>
                </Pressable>
              ))}

              <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.
              </Text>

              {/* Apple Required Subscription Disclosures */}
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8, marginTop: 4, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.foreground }}>Abonelik Bilgileri</Text>
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
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Satın Almaları Geri Yükle</Text>
          </Pressable>

          {/* Legal Links — Apple Required */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, paddingBottom: 8 }}>
            <Pressable onPress={() => router.push("/terms-of-service")}>
              <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: "underline" }}>Kullanım Şartları</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/privacy-policy")}>
              <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: "underline" }}>Gizlilik Politikası</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

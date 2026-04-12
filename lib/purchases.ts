/**
 * RevenueCat integration for Content Queen.
 * Handles in-app purchases and subscriptions.
 */
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_API_KEY_PRODUCTION = "appl_MXpxxMyfsyQiUPxPqauVEBgOukK";
const REVENUECAT_API_KEY_TEST = "test_XcwALNssakPzsaFhvSdmrKczXfK";

// Expo Go'da test key, development/production build'de production key
const isExpoGo = !global.nativeModuleProxy;
const REVENUECAT_API_KEY = __DEV__ ? REVENUECAT_API_KEY_TEST : REVENUECAT_API_KEY_PRODUCTION;

// Product IDs matching App Store Connect
export const PRODUCT_IDS = {
  credits_10: "credits_10",
  credits_50: "credits_50",
  credits_150: "credits_150",
  sub_basic: "sub_basic",
  sub_pro: "sub_pro",
  sub_premium: "sub_premium",
} as const;

// Credit amounts per product
export const CREDIT_AMOUNTS: Record<string, number> = {
  credits_10: 10,
  credits_50: 50,
  credits_150: 150,
};

let isInitialized = false;

/**
 * Initialize RevenueCat SDK. Call once on app start.
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (isInitialized) return;

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId || undefined,
    });

    isInitialized = true;
    console.log("[Purchases] Initialized");
  } catch (error) {
    // Expo Go'da sessizce fail et
    console.warn("[Purchases] Init skipped (Expo Go):", (error as any)?.message?.substring(0, 50));
  }
}

/**
 * Set user ID after login.
 */
export async function loginPurchases(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log("[Purchases] Logged in:", userId);
  } catch (error) {
    console.error("[Purchases] Login failed:", error);
  }
}

/**
 * Get available packages (credit packs + subscriptions).
 */
export async function getOfferings(): Promise<{
  creditPackages: PurchasesPackage[];
  subscriptions: PurchasesPackage[];
}> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current) {
      return { creditPackages: [], subscriptions: [] };
    }

    return {
      creditPackages: current.availablePackages.filter((p) =>
        p.identifier.startsWith("credits_"),
      ),
      subscriptions: current.availablePackages.filter((p) =>
        p.identifier.startsWith("sub_"),
      ),
    };
  } catch (error) {
    console.error("[Purchases] Get offerings failed:", error);
    return { creditPackages: [], subscriptions: [] };
  }
}

/**
 * Purchase a package (credit pack or subscription).
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: "cancelled" };
    }
    console.error("[Purchases] Purchase failed:", error);
    return { success: false, error: error.message || "Satın alma başarısız" };
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("[Purchases] Restore failed:", error);
    return null;
  }
}

/**
 * Get current customer info (active subscriptions, etc).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("[Purchases] Get customer info failed:", error);
    return null;
  }
}

/**
 * Check if user has active subscription.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return Object.keys(info.entitlements.active).length > 0;
}

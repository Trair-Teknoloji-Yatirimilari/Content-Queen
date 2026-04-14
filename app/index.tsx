import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";

const ONBOARDING_VERSION = "1.0.0";

export default function IndexScreen() {
  const router = useRouter();
  const { isSignedIn, isLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      try {
        const done = await AsyncStorage.getItem("cq_onboarding_done");
        const version = await AsyncStorage.getItem("cq_onboarding_version");

        if (done !== "true" || version !== ONBOARDING_VERSION) {
          router.replace("/onboarding");
        } else if (!isSignedIn) {
          router.replace("/login");
        } else {
          router.replace("/(tabs)/home" as any);
        }
      } catch {
        router.replace("/onboarding");
      } finally {
        setChecking(false);
      }
    })();
  }, [isLoading, isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#E94B8F" />
    </View>
  );
}

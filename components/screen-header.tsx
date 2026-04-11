import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useColors();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}
    >
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            opacity: pressed ? 0.6 : 1,
            padding: 4,
          })}
        >
          <Text style={{ fontSize: 18, color: colors.primary }}>‹</Text>
          <Text style={{ fontSize: 15, color: colors.primary, fontWeight: "600" }}>Geri</Text>
        </Pressable>
      ) : (
        <View style={{ width: 60 }} />
      )}

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>{subtitle}</Text>
        )}
      </View>

      {rightAction ? rightAction : <View style={{ width: 60 }} />}
    </View>
  );
}

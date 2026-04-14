import React from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n-context";
import { useState, useCallback } from "react";

const ICONS: Record<string, string> = {
  training_ready: "🎉",
  training_failed: "😔",
  image_generated: "✨",
  image_failed: "❌",
  credits_added: "💎",
  referral: "🎁",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const notifQuery = trpc.notifications.list.useQuery();
  const markReadMutation = trpc.notifications.markRead.useMutation();
  const markAllMutation = trpc.notifications.markAllRead.useMutation();
  const deleteMutation = trpc.notifications.delete.useMutation();
  const deleteAllMutation = trpc.notifications.deleteAll.useMutation();
  const utils = trpc.useUtils();

  const items = notifQuery.data ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await notifQuery.refetch();
    setRefreshing(false);
  }, []);

  const handlePress = async (notif: typeof items[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!notif.isRead) {
      await markReadMutation.mutateAsync({ id: notif.id });
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    }

    // Navigate based on type
    try {
      const data = notif.data ? JSON.parse(notif.data) : {};
      if (data.type === "image_generated" && data.imageId) {
        router.push(`/image-detail?id=${data.imageId}`);
      } else if (data.type === "training_ready") {
        router.push("/training");
      }
    } catch {}
  };

  const handleMarkAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAllMutation.mutateAsync();
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };

  const handleDelete = (notif: typeof items[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Bildirimi Sil", "Bu bildirimi silmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await deleteMutation.mutateAsync({ id: notif.id });
          utils.notifications.list.invalidate();
          utils.notifications.unreadCount.invalidate();
        },
      },
    ]);
  };

  const handleDeleteAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Tüm Bildirimleri Sil", "Tüm bildirimler silinecek. Emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Hepsini Sil",
        style: "destructive",
        onPress: async () => {
          await deleteAllMutation.mutateAsync();
          utils.notifications.list.invalidate();
          utils.notifications.unreadCount.invalidate();
        },
      },
    ]);
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} sa önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Bildirimler" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Actions */}
        {items.length > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 }}>
            {unreadCount > 0 ? (
              <Pressable onPress={handleMarkAll}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Tümünü okundu işaretle</Text>
              </Pressable>
            ) : <View />}
            <Pressable onPress={handleDeleteAll}>
              <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600" }}>Tümünü Sil</Text>
            </Pressable>
          </View>
        )}

        {notifQuery.isLoading && (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!notifQuery.isLoading && items.length === 0 && (
          <View style={{ paddingVertical: 80, alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Bildirim yok</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>Yeni bildirimler burada görünecek</Text>
          </View>
        )}

        {items.map((notif) => (
          <Pressable
            key={notif.id}
            onPress={() => handlePress(notif)}
            onLongPress={() => handleDelete(notif)}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: notif.isRead ? "transparent" : "rgba(233,75,143,0.04)",
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {/* Icon */}
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.surface,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 20 }}>{ICONS[notif.type] || "📌"}</Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: notif.isRead ? "500" : "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
                  {notif.title}
                </Text>
                {!notif.isRead && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8 }} />
                )}
              </View>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }} numberOfLines={2}>
                {notif.body}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                {formatTime(notif.createdAt)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useQuery } from '../lib/hooks';
import { useSocketEvent } from '../lib/realtime';
import { relativeTime } from '../lib/format';
import { spacing, useColors } from '../lib/theme';
import type { AppNotification } from '../lib/types';
import { EmptyState, ErrorBanner, Loading, T } from '../components/ui';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  outbid: 'trending-up',
  won: 'trophy',
  lost: 'flag',
  sold: 'cash',
  not_sold: 'refresh',
  payment_reminder: 'alarm',
  payment_received: 'card',
  unpaid: 'close-circle',
  shipped: 'cube',
  completed: 'checkmark-circle',
  question: 'chatbubble-ellipses',
  answer: 'chatbubbles',
  ending_soon: 'time',
  rejected: 'ban',
  dispute: 'alert-circle',
  review: 'star',
};

export default function NotificationsScreen() {
  const c = useColors();
  const { setUnread } = useAuth();
  const list = useQuery(() => api.get<AppNotification[]>('/me/notifications'));

  // Opening the list marks everything as read.
  useEffect(() => {
    void api.post('/me/notifications/read').then(() => setUnread(() => 0)).catch(() => {});
  }, [setUnread]);

  useSocketEvent<AppNotification>('notification', (n) => {
    list.setData((items) => [{ ...n, read: true }, ...(items ?? [])]);
    void api.post('/me/notifications/read').then(() => setUnread(() => 0)).catch(() => {});
  });

  const open = (n: AppNotification) => {
    if (n.orderId && n.type !== 'outbid' && n.type !== 'question' && n.type !== 'answer') router.push(`/order/${n.orderId}`);
    else if (n.auctionId) router.push(`/auction/${n.auctionId}`);
  };

  if (list.loading && !list.data) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={list.data ?? []}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ flexGrow: 1 }}
      ListHeaderComponent={list.error ? <View style={{ padding: spacing.lg }}><ErrorBanner message={list.error} onRetry={list.reload} /></View> : null}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => open(item)}
          style={({ pressed }) => [styles.item, { borderBottomColor: c.border, backgroundColor: item.read ? 'transparent' : c.primarySoft, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name={ICONS[item.type] ?? 'notifications'} size={20} color={item.type === 'outbid' || item.type === 'unpaid' ? c.danger : c.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="h3">{item.title}</T>
            <T variant="small" color={c.textMuted}>{item.body}</T>
            <T variant="tiny" color={c.textFaint}>{relativeTime(item.createdAt)}</T>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="Sin notificaciones" message="Aquí verás cuando te superen, ganes una subasta o vendas un artículo." />}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={c.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

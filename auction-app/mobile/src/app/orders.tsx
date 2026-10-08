import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { api, imageUrl } from '../lib/api';
import { useQuery } from '../lib/hooks';
import { money, ORDER_STATUS_LABEL, relativeTime } from '../lib/format';
import { radius, spacing, useColors } from '../lib/theme';
import type { OrderListItem } from '../lib/types';
import { Badge, EmptyState, ErrorBanner, Loading, T } from '../components/ui';

export default function OrdersScreen() {
  const c = useColors();
  const list = useQuery(() => api.get<OrderListItem[]>('/me/orders'));

  if (list.loading && !list.data) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={list.data ?? []}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      ListHeaderComponent={list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      renderItem={({ item }) => {
        const needsAction = (item.role === 'buyer' && item.status === 'awaiting_payment') || (item.role === 'seller' && item.status === 'paid');
        return (
          <Pressable
            onPress={() => router.push(`/order/${item.id}`)}
            style={({ pressed }) => [styles.row, { backgroundColor: c.surface, borderColor: needsAction ? c.primary : c.border, opacity: pressed ? 0.85 : 1 }]}
          >
            <Image source={imageUrl(item.image)} style={styles.thumb} contentFit="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="h3" numberOfLines={1}>{item.title}</T>
              <T variant="small" color={c.textMuted}>
                {item.role === 'buyer' ? 'Compra' : 'Venta'} · {money(item.role === 'buyer' ? item.total : item.sellerPayout)} · {relativeTime(item.createdAt)}
              </T>
              <Badge
                label={needsAction ? (item.role === 'buyer' ? 'Pagar ahora' : 'Enviar ahora') : ORDER_STATUS_LABEL[item.status]}
                tone={needsAction ? 'primary' : item.status === 'completed' ? 'success' : item.status === 'unpaid' || item.status === 'disputed' ? 'danger' : 'neutral'}
              />
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
          </Pressable>
        );
      }}
      ListEmptyComponent={<EmptyState icon="receipt-outline" title="Sin pedidos todavía" message="Cuando ganes o vendas una subasta, el pedido aparecerá aquí." />}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={c.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
});

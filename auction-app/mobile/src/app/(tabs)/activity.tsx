import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useNow, useQuery } from '../../lib/hooks';
import { useSocketEvent, useWatchAuctions } from '../../lib/realtime';
import { money } from '../../lib/format';
import { radius, spacing, useColors } from '../../lib/theme';
import type { AuctionLive, AuctionSummary, OrderListItem } from '../../lib/types';
import { AuctionCard } from '../../components/AuctionCard';
import { EmptyState, ErrorBanner, Loading, Row, T } from '../../components/ui';

type Item = AuctionSummary & { myMax?: number; isLeading?: boolean };

export default function ActivityScreen() {
  const { user } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <EmptyState
          icon="flash-outline"
          title="Sigue tus pujas en tiempo real"
          message="Inicia sesión para pujar, seguir artículos y recibir avisos cuando te superen."
          action="Iniciar sesión"
          onAction={() => router.push('/login')}
        />
      </View>
    );
  }
  return <Activity />;
}

function Activity() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [tab, setTab] = useState<'bids' | 'watching'>('bids');
  const bids = useQuery(() => api.get<Item[]>('/me/bids'));
  const watching = useQuery(() => api.get<Item[]>('/me/watchlist'));
  const orders = useQuery(() => api.get<OrderListItem[]>('/me/orders'));
  const current = tab === 'bids' ? bids : watching;

  useWatchAuctions([...(bids.data ?? []), ...(watching.data ?? [])].filter((a) => a.status === 'active').map((a) => a.id));
  useSocketEvent<AuctionLive>('auction:update', (live) => {
    const patch = (list?: Item[]) =>
      list?.map((a) =>
        a.id === live.auctionId ? { ...a, currentPrice: live.currentPrice, bidCount: live.bidCount, endAt: live.endAt, status: live.status } : a,
      );
    watching.setData(patch);
    // Leading/outbid can change with any update; refetch our bids for accuracy.
    if (bids.data?.some((a) => a.id === live.auctionId)) void bids.reload();
  });

  const toPay = (orders.data ?? []).filter((o) => o.role === 'buyer' && o.status === 'awaiting_payment');
  const toShip = (orders.data ?? []).filter((o) => o.role === 'seller' && o.status === 'paid');

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      <T variant="title">Mi actividad</T>
      {toPay.map((o) => (
        <ActionBanner
          key={o.id}
          icon="card"
          tone={c.warning}
          bg={c.warningSoft}
          title={`Paga «${o.title}»`}
          body={`${money(o.total)} · Pago pendiente`}
          onPress={() => router.push(`/order/${o.id}`)}
        />
      ))}
      {toShip.map((o) => (
        <ActionBanner
          key={o.id}
          icon="cube"
          tone={c.primary}
          bg={c.primarySoft}
          title={`Envía «${o.title}»`}
          body="El comprador ya ha pagado"
          onPress={() => router.push(`/order/${o.id}`)}
        />
      ))}
      <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
        {(['bids', 'watching'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segmentItem, tab === t && { backgroundColor: c.surface }]}>
            <T variant="small" color={tab === t ? c.text : c.textMuted} style={{ fontWeight: '700' }}>
              {t === 'bids' ? 'Mis pujas' : 'Seguidas'}
            </T>
          </Pressable>
        ))}
      </View>
      {current.error ? <ErrorBanner message={current.error} onRetry={current.reload} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <FlatList
        data={current.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <AuctionCard auction={item} now={now} layout="row" />}
        ListEmptyComponent={
          current.loading ? (
            <View style={{ height: 200 }}><Loading /></View>
          ) : tab === 'bids' ? (
            <EmptyState icon="hammer-outline" title="Aún no has pujado" message="Explora las subastas activas y haz tu primera puja." action="Explorar" onAction={() => router.navigate('/')} />
          ) : (
            <EmptyState icon="heart-outline" title="No sigues ningún artículo" message="Pulsa el corazón en un artículo para seguirlo y recibir avisos antes de que termine." />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={current.refreshing}
            onRefresh={() => Promise.all([current.refresh(), orders.reload()])}
            tintColor={c.primary}
          />
        }
      />
    </View>
  );
}

function ActionBanner(props: { icon: 'card' | 'cube'; tone: string; bg: string; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.banner, { backgroundColor: props.bg }]}>
      <Ionicons name={props.icon} size={22} color={props.tone} />
      <View style={{ flex: 1 }}>
        <T variant="h3" numberOfLines={1}>{props.title}</T>
        <T variant="small" color={props.tone}>{props.body}</T>
      </View>
      <Row><Ionicons name="chevron-forward" size={18} color={props.tone} /></Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.md },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
});

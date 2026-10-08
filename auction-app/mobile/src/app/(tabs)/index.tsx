import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useNow, useQuery } from '../../lib/hooks';
import { useSocketEvent, useWatchAuctions } from '../../lib/realtime';
import { font, radius, spacing, useColors } from '../../lib/theme';
import type { AuctionLive, AuctionSummary, Category } from '../../lib/types';
import { AuctionCard } from '../../components/AuctionCard';
import { Chip, EmptyState, ErrorBanner, Loading, Row, T } from '../../components/ui';

const SORTS = [
  { id: 'ending_soon', label: 'Terminan antes' },
  { id: 'newest', label: 'Novedades' },
  { id: 'most_bids', label: 'Más pujadas' },
  { id: 'price_asc', label: 'Precio ↑' },
  { id: 'price_desc', label: 'Precio ↓' },
];

interface Page {
  items: AuctionSummary[];
  nextOffset: number | null;
}

export default function ExploreScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const now = useNow();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState('ending_soon');
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useQuery(() => api.get<Category[]>('/categories'), [], { refetchOnFocus: false });
  const buildPath = (offset: number) => {
    const params = new URLSearchParams({ sort, limit: '20', offset: String(offset) });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    return `/auctions?${params}`;
  };
  const list = useQuery(() => api.get<Page>(buildPath(0)), [query, category, sort]);

  // Prices on visible cards update live.
  useWatchAuctions((list.data?.items ?? []).filter((a) => a.status === 'active').map((a) => a.id));
  useSocketEvent<AuctionLive>('auction:update', (live) => {
    list.setData((page) =>
      page && {
        ...page,
        items: page.items.map((a) =>
          a.id === live.auctionId
            ? { ...a, currentPrice: live.currentPrice, bidCount: live.bidCount, endAt: live.endAt, status: live.status, buyNowAvailable: live.buyNowAvailable }
            : a,
        ),
      },
    );
  });

  const loadMore = async () => {
    const page = list.data;
    if (!page?.nextOffset || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api.get<Page>(buildPath(page.nextOffset));
      list.setData({ items: [...page.items, ...next.items], nextOffset: next.nextOffset });
    } finally {
      setLoadingMore(false);
    }
  };

  const items = (list.data?.items ?? []).filter((a) => sort !== 'ending_soon' || a.status === 'active');

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="small" color={c.textMuted}>{user ? `Hola, ${user.displayName}` : 'Bienvenido a'}</T>
          <T variant="title">Subastia</T>
        </View>
        <Pressable
          onPress={() => router.push(user ? '/notifications' : '/login')}
          hitSlop={10}
          style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Ionicons name="notifications-outline" size={22} color={c.text} />
          {user?.unreadNotifications ? <View style={[styles.dot, { backgroundColor: c.danger }]} /> : null}
        </Pressable>
      </Row>

      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar relojes, cámaras, arte…"
          placeholderTextColor={c.textFaint}
          returnKeyType="search"
          style={[font.body, { flex: 1, color: c.text }]}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={c.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="Todo" icon="apps" selected={!category} onPress={() => setCategory(null)} />
        {(categories.data ?? []).map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            icon={cat.icon as never}
            selected={category === cat.id}
            onPress={() => setCategory(category === cat.id ? null : cat.id)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg }}>
        {SORTS.map((s) => (
          <Pressable key={s.id} onPress={() => setSort(s.id)} hitSlop={6}>
            <T variant="small" color={sort === s.id ? c.text : c.textFaint} style={sort === s.id && { fontWeight: '800' }}>
              {s.label}
            </T>
            {sort === s.id ? <View style={[styles.underline, { backgroundColor: c.primary }]} /> : null}
          </Pressable>
        ))}
      </ScrollView>

      {list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <AuctionCard auction={item} now={now} />}
        ListEmptyComponent={
          list.loading ? (
            <View style={{ height: 240 }}><Loading /></View>
          ) : (
            <EmptyState icon="search" title="No hay resultados" message="Prueba con otra búsqueda o categoría." />
          )
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={c.primary} />}
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  dot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  underline: { height: 3, borderRadius: 2, marginTop: 4 },
});

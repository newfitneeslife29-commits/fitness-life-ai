import { FlatList, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useNow, useQuery } from '../lib/hooks';
import { spacing, useColors } from '../lib/theme';
import type { AuctionSummary } from '../lib/types';
import { AuctionCard } from '../components/AuctionCard';
import { EmptyState, ErrorBanner, Loading, T } from '../components/ui';

type Item = AuctionSummary & { rejectionReason: string | null };

export default function SellingScreen() {
  const c = useColors();
  const now = useNow();
  const list = useQuery(() => api.get<Item[]>('/me/selling'));

  if (list.loading && !list.data) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={list.data ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      ListHeaderComponent={list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> : null}
      renderItem={({ item }) => (
        <View style={{ gap: 4 }}>
          <AuctionCard auction={item} now={now} layout="row" />
          {item.rejectionReason ? <T variant="small" color={c.danger}>{item.rejectionReason}</T> : null}
        </View>
      )}
      ListEmptyComponent={
        <EmptyState icon="pricetags-outline" title="Aún no vendes nada" message="Publica tu primer artículo en un par de minutos." action="Vender ahora" onAction={() => router.navigate('/sell')} />
      }
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={c.primary} />}
    />
  );
}

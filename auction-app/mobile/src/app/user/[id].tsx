import { RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';
import { useNow, useQuery } from '../../lib/hooks';
import { relativeTime } from '../../lib/format';
import { spacing, useColors } from '../../lib/theme';
import type { AuctionSummary, User } from '../../lib/types';
import { AuctionCard } from '../../components/AuctionCard';
import { Avatar, Card, ErrorBanner, Loading, Row, Stars, T } from '../../components/ui';

interface Profile {
  user: User;
  reviews: { rating: number; comment: string | null; author: string; createdAt: number }[];
  activeAuctions: AuctionSummary[];
}

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const now = useNow();
  const page = useQuery(() => api.get<Profile>(`/users/${id}`), [id]);

  if (!page.data) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, backgroundColor: c.background }}>
        {page.error ? <ErrorBanner message={page.error} onRetry={page.reload} /> : <Loading />}
      </View>
    );
  }
  const { user, reviews, activeAuctions } = page.data;
  const years = Math.max(1, Math.round((now - user.memberSince) / (365 * 86_400_000)));

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
      refreshControl={<RefreshControl refreshing={page.refreshing} onRefresh={page.refresh} tintColor={c.primary} />}
    >
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={user.displayName} size={80} />
        <T variant="title">{user.displayName}</T>
        <Row gap={6}>
          <Stars rating={user.rating} />
          <T variant="small" color={c.textMuted}>{user.rating ? `${user.rating} · ${user.ratingCount} valoraciones` : 'Sin valoraciones'}</T>
        </Row>
        <T variant="small" color={c.textMuted}>
          {user.city ? `${user.city} · ` : ''}{user.salesCount} ventas · Miembro desde hace {years} {years === 1 ? 'año' : 'años'}
        </T>
      </View>

      <View style={{ gap: spacing.md }}>
        <T variant="h2">En subasta ({activeAuctions.length})</T>
        {activeAuctions.length === 0 ? <T color={c.textMuted}>No tiene subastas activas.</T> : null}
        {activeAuctions.map((a) => <AuctionCard key={a.id} auction={a} now={now} layout="row" />)}
      </View>

      <View style={{ gap: spacing.md }}>
        <T variant="h2">Valoraciones</T>
        {reviews.length === 0 ? <T color={c.textMuted}>Todavía no tiene valoraciones escritas.</T> : null}
        {reviews.map((r, i) => (
          <Card key={i} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h3">{r.author}</T>
              <Stars rating={r.rating} size={12} />
            </Row>
            {r.comment ? <T color={c.textMuted}>{r.comment}</T> : null}
            <T variant="tiny" color={c.textFaint}>{relativeTime(r.createdAt)}</T>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

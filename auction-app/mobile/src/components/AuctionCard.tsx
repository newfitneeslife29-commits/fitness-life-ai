import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { imageUrl } from '../lib/api';
import { AUCTION_STATUS_LABEL, money, remaining } from '../lib/format';
import { radius, spacing, useColors } from '../lib/theme';
import type { AuctionSummary } from '../lib/types';
import { Badge, Row, T } from './ui';

interface Props {
  auction: AuctionSummary & { myMax?: number; isLeading?: boolean };
  now: number;
  layout?: 'grid' | 'row';
}

export function AuctionCard({ auction, now, layout = 'grid' }: Props) {
  const c = useColors();
  const time = remaining(auction.endAt, now);
  const active = auction.status === 'active';
  const open = () => router.push(`/auction/${auction.id}`);

  const statusBadge = !active ? (
    <Badge label={AUCTION_STATUS_LABEL[auction.status]} tone={auction.status === 'sold' ? 'success' : 'neutral'} />
  ) : auction.isLeading !== undefined ? (
    auction.isLeading ? <Badge label="Vas ganando" tone="success" icon="trophy" /> : <Badge label="Superado" tone="danger" icon="arrow-down" />
  ) : null;

  if (layout === 'row') {
    return (
      <Pressable onPress={open} style={({ pressed }) => [styles.row, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}>
        <Image source={imageUrl(auction.image)} style={styles.rowImage} contentFit="cover" transition={200} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="h3" numberOfLines={2}>{auction.title}</T>
          <T variant="h2">{money(auction.currentPrice, auction.currency)}</T>
          <Row gap={spacing.md}>
            <T variant="small" color={c.textMuted}>{auction.bidCount} pujas</T>
            {active ? (
              <Row gap={4}>
                <Ionicons name="time-outline" size={13} color={time.urgent ? c.danger : c.textMuted} />
                <T variant="small" color={time.urgent ? c.danger : c.textMuted}>{time.short}</T>
              </Row>
            ) : null}
          </Row>
          {auction.myMax ? <T variant="small" color={c.textFaint}>Tu máximo: {money(auction.myMax)}</T> : null}
          {statusBadge}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.grid, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.gridImageWrap, { backgroundColor: c.surfaceAlt }]}>
        <Image source={imageUrl(auction.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {active ? (
          <View style={[styles.timePill, { backgroundColor: time.urgent ? c.danger : 'rgba(11,18,32,0.75)' }]}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <T variant="tiny" color="#fff">{time.short}</T>
          </View>
        ) : null}
      </View>
      <View style={{ paddingTop: spacing.sm, gap: 2 }}>
        <T variant="small" numberOfLines={2} style={{ minHeight: 34 }}>{auction.title}</T>
        <T variant="h3" style={{ fontSize: 17 }}>{money(auction.currentPrice, auction.currency)}</T>
        <Row gap={6}>
          <T variant="tiny" color={c.textMuted}>{auction.bidCount} {auction.bidCount === 1 ? 'puja' : 'pujas'}</T>
          {auction.buyNowAvailable ? <T variant="tiny" color={c.primary}>· Compra ya</T> : null}
        </Row>
        {statusBadge}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1 },
  gridImageWrap: { aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' },
  timePill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowImage: { width: 96, height: 96, borderRadius: radius.md },
});

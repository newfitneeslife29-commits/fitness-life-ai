import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRealtime } from '../lib/realtime';
import { radius, spacing, useColors } from '../lib/theme';
import { T } from './ui';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  outbid: 'trending-up',
  won: 'trophy',
  sold: 'cash',
  payment_received: 'card',
  shipped: 'cube',
  ending_soon: 'alarm',
  question: 'chatbubble-ellipses',
  answer: 'chatbubbles',
};

/** In-app banner for realtime notifications (outbid, won, paid...). */
export function NotificationToast() {
  const { toast, dismissToast } = useRealtime();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-160));

  useEffect(() => {
    if (!toast) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    const t = setTimeout(() => {
      Animated.timing(y, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => dismissToast());
    }, 4500);
    return () => clearTimeout(t);
  }, [toast, y, dismissToast]);

  if (!toast) return null;
  const urgent = toast.type === 'outbid' || toast.type === 'unpaid';

  const open = () => {
    dismissToast();
    if (toast.orderId && ['won', 'sold', 'payment_received', 'shipped', 'completed', 'payment_reminder', 'dispute'].includes(toast.type)) {
      router.push(`/order/${toast.orderId}`);
    } else if (toast.auctionId) {
      router.push(`/auction/${toast.auctionId}`);
    }
  };

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY: y }] }]}>
      <Pressable onPress={open} style={[styles.toast, { backgroundColor: c.text }]}>
        <Ionicons name={ICONS[toast.type] ?? 'notifications'} size={22} color={urgent ? '#F87171' : c.accent} />
        <Animated.View style={{ flex: 1 }}>
          <T variant="h3" color={c.background}>{toast.title}</T>
          <T variant="small" color={c.background} numberOfLines={2} style={{ opacity: 0.8 }}>{toast.body}</T>
        </Animated.View>
        <Ionicons name="chevron-forward" size={18} color={c.background} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

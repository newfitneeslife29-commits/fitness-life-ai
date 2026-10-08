import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useRealtime } from '../../lib/realtime';
import { radius, spacing, useColors } from '../../lib/theme';
import { Avatar, Badge, Button, Card, EmptyState, Row, Stars, T, type IconName } from '../../components/ui';

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const { connected } = useRealtime();
  const c = useColors();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <EmptyState
          icon="person-circle-outline"
          title="Tu cuenta de Subastia"
          message="Crea una cuenta gratis para pujar, vender y gestionar tus pedidos."
          action="Iniciar sesión"
          onAction={() => router.push('/login')}
        />
        <Button title="Crear cuenta" variant="ghost" onPress={() => router.push('/register')} style={{ marginBottom: insets.bottom + spacing.xl }} />
      </View>
    );
  }

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, gap: spacing.xl }}>
      <Row gap={spacing.lg}>
        <Avatar name={user.displayName} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="h2">{user.displayName}</T>
          <T variant="small" color={c.textMuted}>{user.email}</T>
          <Row gap={6}>
            <Stars rating={user.rating} />
            <T variant="small" color={c.textMuted}>{user.rating ? `${user.rating} · ${user.ratingCount} valoraciones` : 'Sin valoraciones'}</T>
          </Row>
        </View>
      </Row>

      <Row gap={spacing.md}>
        <Stat label="Ventas" value={user.salesCount} />
        <Stat label="Compras" value={user.purchasesCount} />
        <Stat label="Impagos" value={user.unpaidStrikes} danger={user.unpaidStrikes > 0} />
      </Row>

      <Card padded={false}>
        <MenuItem icon="notifications-outline" label="Notificaciones" badge={user.unreadNotifications} onPress={() => router.push('/notifications')} />
        <MenuItem icon="pricetags-outline" label="Mis ventas" onPress={() => router.push('/selling')} />
        <MenuItem icon="receipt-outline" label="Pedidos y pagos" onPress={() => router.push('/orders')} />
        <MenuItem icon="storefront-outline" label="Mi perfil público" onPress={() => router.push(`/user/${user.id}`)} last />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Row>
          <Ionicons name="shield-checkmark" size={20} color={c.success} />
          <T variant="h3">Compra protegida</T>
        </Row>
        <T variant="small" color={c.textMuted}>
          Tu pago queda retenido hasta que confirmas que has recibido el artículo. Si algo va mal, abre una incidencia desde el pedido.
        </T>
      </Card>

      <Row style={{ justifyContent: 'center' }}>
        <Badge label={connected ? 'Conectado en tiempo real' : 'Reconectando…'} tone={connected ? 'success' : 'warning'} icon={connected ? 'radio' : 'cloud-offline'} />
      </Row>

      <Button title="Cerrar sesión" variant="secondary" icon="log-out-outline" onPress={confirmLogout} />
    </ScrollView>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <T variant="h2" color={danger ? c.danger : c.text}>{value}</T>
      <T variant="small" color={c.textMuted}>{label}</T>
    </Card>
  );
}

function MenuItem({ icon, label, onPress, badge, last }: { icon: IconName; label: string; onPress: () => void; badge?: number; last?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { borderBottomColor: c.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={c.text} />
      <T style={{ flex: 1 }}>{label}</T>
      {badge ? (
        <View style={[styles.count, { backgroundColor: c.danger }]}>
          <T variant="tiny" color="#fff">{badge > 99 ? '99+' : badge}</T>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  count: { minWidth: 22, height: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});

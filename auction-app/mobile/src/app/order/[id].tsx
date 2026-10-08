import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, errorMessage, imageUrl } from '../../lib/api';
import { useNow, useQuery } from '../../lib/hooks';
import { useSocketEvent } from '../../lib/realtime';
import { dateTime, money, ORDER_STATUS_LABEL, remaining } from '../../lib/format';
import { radius, spacing, useColors } from '../../lib/theme';
import type { Order, OrderPage } from '../../lib/types';
import { Avatar, Badge, Button, Card, Divider, ErrorBanner, Field, Loading, Row, Stars, T } from '../../components/ui';

const STEPS: { key: Order['status']; label: string }[] = [
  { key: 'awaiting_payment', label: 'Pago' },
  { key: 'paid', label: 'Envío' },
  { key: 'shipped', label: 'En camino' },
  { key: 'completed', label: 'Completado' },
];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const page = useQuery(() => api.get<OrderPage>(`/orders/${id}`), [id]);

  useSocketEvent<Order>('order:update', (order) => {
    if (order.id === id) page.setData((p) => (p ? { ...p, order } : p));
  });

  if (!page.data) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, backgroundColor: c.background }}>
        {page.error ? <ErrorBanner message={page.error} onRetry={page.reload} /> : <Loading />}
      </View>
    );
  }

  const { order, auction, role, counterpart, reviewed } = page.data;
  const update = (o: Order) => page.setData((p) => (p ? { ...p, order: o } : p));
  const stepIndex = STEPS.findIndex((s) => s.key === order.status);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={page.refreshing} onRefresh={page.refresh} tintColor={c.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.push(`/auction/${auction.id}`)}>
          <Card>
            <Row gap={spacing.md}>
              <Image source={imageUrl(auction.image)} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="h3" numberOfLines={2}>{auction.title}</T>
                <Badge
                  label={ORDER_STATUS_LABEL[order.status]}
                  tone={order.status === 'completed' ? 'success' : order.status === 'unpaid' || order.status === 'disputed' ? 'danger' : 'primary'}
                />
              </View>
            </Row>
          </Card>
        </Pressable>

        {stepIndex >= 0 ? (
          <Row gap={0} style={{ justifyContent: 'space-between' }}>
            {STEPS.map((s, i) => {
              const done = i < stepIndex || order.status === 'completed';
              const current = i === stepIndex && order.status !== 'completed';
              return (
                <View key={s.key} style={{ alignItems: 'center', flex: 1, gap: 6 }}>
                  <View style={[styles.step, { backgroundColor: done ? c.success : current ? c.primary : c.surfaceAlt }]}>
                    <Ionicons name={done ? 'checkmark' : 'ellipse'} size={done ? 16 : 8} color={done || current ? '#fff' : c.textFaint} />
                  </View>
                  <T variant="tiny" color={current ? c.text : c.textMuted}>{s.label}</T>
                </View>
              );
            })}
          </Row>
        ) : null}

        {role === 'buyer' ? <BuyerActions order={order} onUpdate={update} /> : <SellerActions order={order} onUpdate={update} />}

        {order.status === 'completed' && !reviewed ? (
          <ReviewForm orderId={order.id} name={counterpart.displayName} onDone={page.reload} />
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <T variant="h3">Resumen</T>
          <Line label="Precio de remate" value={money(order.hammerPrice)} />
          {role === 'buyer' ? (
            <>
              <Line label="Comisión del comprador" value={money(order.buyerFee)} />
              <Line label="IVA sobre la comisión" value={money(order.tax)} />
              <Line label="Envío" value={order.shippingCost ? money(order.shippingCost) : 'Gratis'} />
              <Divider />
              <Line label="Total" value={money(order.total)} bold />
            </>
          ) : (
            <>
              <Line label="Envío cobrado al comprador" value={money(order.shippingCost)} />
              <Line label="Comisión de venta" value={`−${money(order.sellerFee)}`} />
              <Divider />
              <Line label="Recibirás" value={money(order.sellerPayout)} bold />
            </>
          )}
        </Card>

        {order.shippingAddress || order.trackingNumber ? (
          <Card style={{ gap: spacing.sm }}>
            <T variant="h3">Envío</T>
            {order.shippingAddress ? <Line label="Dirección" value={order.shippingAddress} /> : null}
            {order.carrier ? <Line label="Transportista" value={order.carrier} /> : null}
            {order.trackingNumber ? <Line label="Seguimiento" value={order.trackingNumber} /> : null}
            {order.shippedAt ? <Line label="Enviado" value={dateTime(order.shippedAt)} /> : null}
          </Card>
        ) : null}

        <Pressable onPress={() => router.push(`/user/${counterpart.id}`)}>
          <Card>
            <Row gap={spacing.md}>
              <Avatar name={counterpart.displayName} />
              <View style={{ flex: 1 }}>
                <T variant="small" color={c.textMuted}>{role === 'buyer' ? 'Vendedor' : 'Comprador'}</T>
                <T variant="h3">{counterpart.displayName}</T>
              </View>
              <Stars rating={counterpart.rating} size={12} />
            </Row>
          </Card>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BuyerActions({ order, onUpdate }: { order: Order; onUpdate: (o: Order) => void }) {
  const c = useColors();
  const now = useNow();
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [address, setAddress] = useState(order.shippingAddress ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');

  const run = async (fn: () => Promise<Order>, success?: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      onUpdate(updated);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (success) Alert.alert(success);
    } catch (err) {
      setError(errorMessage(err));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  if (order.status === 'awaiting_payment') {
    const due = remaining(order.paymentDueAt, now);
    return (
      <Card style={{ gap: spacing.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="h2">Pagar {money(order.total)}</T>
          <Badge label={`Quedan ${due.short}`} tone={due.urgent ? 'danger' : 'warning'} icon="time" />
        </Row>
        <Field label="Dirección de envío" value={address} onChangeText={setAddress} placeholder="Calle, número, CP, ciudad" />
        <Field label="Número de tarjeta" value={card} onChangeText={(v) => setCard(formatCard(v))} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
        <Row gap={spacing.md}>
          <View style={{ flex: 1 }}>
            <Field label="Caducidad" value={expiry} onChangeText={(v) => setExpiry(formatExpiry(v))} keyboardType="number-pad" placeholder="MM/AA" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="CVC" value={cvc} onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="123" secureTextEntry />
          </View>
        </Row>
        <View style={[styles.note, { backgroundColor: c.primarySoft }]}>
          <Ionicons name="flask" size={16} color={c.primary} />
          <T variant="small" style={{ flex: 1 }}>
            Modo pruebas: usa 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada), cualquier fecha futura y CVC.
          </T>
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          title={`Pagar ${money(order.total)}`}
          icon="lock-closed"
          size="lg"
          loading={busy}
          onPress={() =>
            run(
              () => api.post<Order>(`/orders/${order.id}/pay`, { cardNumber: card, expiry, cvc, shippingAddress: address }),
              'Pago completado. Avisaremos al vendedor para que te lo envíe.',
            )
          }
        />
        <Row style={{ justifyContent: 'center' }}>
          <Ionicons name="shield-checkmark" size={14} color={c.success} />
          <T variant="tiny" color={c.textMuted}>Pago protegido: el vendedor no cobra hasta que confirmes la entrega</T>
        </Row>
      </Card>
    );
  }

  if (order.status === 'paid' || order.status === 'shipped') {
    return (
      <Card style={{ gap: spacing.md }}>
        {order.status === 'paid' ? (
          <Status icon="hourglass" title="Esperando el envío" text="Has pagado. El vendedor tiene 3 días hábiles para enviarlo." />
        ) : (
          <>
            <Status icon="cube" title="Tu pedido está en camino" text={`${order.carrier} · ${order.trackingNumber}`} />
            <Button
              title="He recibido el artículo"
              icon="checkmark-circle"
              variant="success"
              loading={busy}
              onPress={() =>
                Alert.alert('Confirmar recepción', 'Liberaremos el pago al vendedor. Hazlo solo si el artículo es como se describía.', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Confirmar', onPress: () => run(() => api.post<Order>(`/orders/${order.id}/confirm-delivery`)) },
                ])
              }
            />
          </>
        )}
        {disputeOpen ? (
          <View style={{ gap: spacing.sm }}>
            <Field value={reason} onChangeText={setReason} placeholder="Describe el problema" multiline />
            <Button title="Abrir incidencia" variant="danger" loading={busy} onPress={() => run(() => api.post<Order>(`/orders/${order.id}/dispute`, { reason }))} />
          </View>
        ) : (
          <Button title="Tengo un problema" variant="ghost" onPress={() => setDisputeOpen(true)} />
        )}
        {error ? <ErrorBanner message={error} /> : null}
      </Card>
    );
  }

  return <StatusCard order={order} />;
}

function SellerActions({ order, onUpdate }: { order: Order; onUpdate: (o: Order) => void }) {
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.status === 'awaiting_payment') {
    return (
      <Card>
        <Status icon="hourglass" title="Esperando el pago" text={`El comprador tiene hasta el ${dateTime(order.paymentDueAt)} para pagar.`} />
      </Card>
    );
  }
  if (order.status === 'paid') {
    const ship = async () => {
      setBusy(true);
      setError(null);
      try {
        onUpdate(await api.post<Order>(`/orders/${order.id}/ship`, { carrier, trackingNumber: tracking }));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    };
    return (
      <Card style={{ gap: spacing.md }}>
        <Status icon="cash" title="¡Pagado! Envíalo ya" text={`Dirección: ${order.shippingAddress}`} />
        <Field label="Transportista" value={carrier} onChangeText={setCarrier} placeholder="Correos, SEUR, MRW…" />
        <Field label="Número de seguimiento" value={tracking} onChangeText={setTracking} autoCapitalize="characters" />
        {error ? <ErrorBanner message={error} /> : null}
        <Button title="Marcar como enviado" icon="cube" loading={busy} onPress={ship} />
      </Card>
    );
  }
  if (order.status === 'shipped') {
    return (
      <Card>
        <Status icon="cube" title="En camino" text="Liberaremos el pago cuando el comprador confirme la entrega (o automáticamente a los 14 días)." />
      </Card>
    );
  }
  return <StatusCard order={order} />;
}

function StatusCard({ order }: { order: Order }) {
  const map: Partial<Record<Order['status'], [keyof typeof Ionicons.glyphMap, string, string]>> = {
    completed: ['checkmark-circle', 'Pedido completado', 'Gracias por usar Subastia.'],
    unpaid: ['close-circle', 'Pedido cancelado por impago', 'El plazo de pago venció.'],
    disputed: ['alert-circle', 'Incidencia abierta', order.disputeReason ?? 'Nuestro equipo está revisando el caso.'],
    refunded: ['return-down-back', 'Reembolsado', 'El importe se ha devuelto al comprador.'],
  };
  const [icon, title, text] = map[order.status] ?? ['information-circle', ORDER_STATUS_LABEL[order.status], ''];
  return (
    <Card>
      <Status icon={icon} title={title} text={text} />
    </Card>
  );
}

function Status({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const c = useColors();
  return (
    <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={26} color={c.primary} />
      <View style={{ flex: 1 }}>
        <T variant="h3">{title}</T>
        {text ? <T variant="small" color={c.textMuted}>{text}</T> : null}
      </View>
    </Row>
  );
}

function ReviewForm({ orderId, name, onDone }: { orderId: string; name: string; onDone: () => void }) {
  const c = useColors();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/${orderId}/review`, { rating, comment });
      onDone();
    } catch (err) {
      Alert.alert('No se pudo enviar', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="h3">Valora a {name}</T>
      <Row gap={spacing.sm}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} onPress={() => setRating(i)} hitSlop={6}>
            <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={32} color={c.accent} />
          </Pressable>
        ))}
      </Row>
      <Field value={comment} onChangeText={setComment} placeholder="Cuenta tu experiencia (opcional)" multiline />
      <Button title="Enviar valoración" loading={busy} onPress={submit} />
    </Card>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={spacing.lg}>
      <T variant={bold ? 'h3' : 'small'} color={bold ? c.text : c.textMuted}>{label}</T>
      <T variant={bold ? 'h3' : 'small'} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  step: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});

import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, ApiError, errorMessage, newIdempotencyKey } from '../lib/api';
import { bidIncrement, centsToInput, money, parseMoney } from '../lib/format';
import { radius, spacing, useColors } from '../lib/theme';
import type { AuctionDetail, BidResponse, Viewer } from '../lib/types';
import { Button, Chip, Divider, ErrorBanner, Field, Row, T } from './ui';

interface Props {
  visible: boolean;
  auction: AuctionDetail;
  viewer: Viewer | null;
  fees: { buyerPremiumBps: number; vatBps: number };
  onClose(): void;
  onPlaced(res: BidResponse): void;
}

export function BidSheet(props: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={props.onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.grabber, { backgroundColor: c.border }]} />
          {/* Mounted only while open, so every opening starts from fresh state. */}
          {props.visible ? <BidForm {...props} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BidForm({ auction, viewer, fees, onClose, onPlaced }: Props) {
  const c = useColors();
  const leading = !!viewer?.isLeading;
  // A leader can only raise their own max; everyone else must beat the minimum.
  const minimum = leading && viewer?.myMax ? viewer.myMax + bidIncrement(viewer.myMax) : auction.minNextBid;
  const suggestions = useMemo(() => {
    const list = [minimum];
    while (list.length < 4) {
      const last = list[list.length - 1]!;
      list.push(last + bidIncrement(last) * (list.length === 1 ? 2 : 4));
    }
    return list;
  }, [minimum]);

  const [input, setInput] = useState(centsToInput(minimum));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Reused across retries, so a bid resent after a network blip can't be placed twice.
  const idempotencyKey = useRef<string | null>(null);

  const amount = parseMoney(input);
  const premium = amount ? Math.round((amount * fees.buyerPremiumBps) / 10_000) : 0;
  const vat = Math.round((premium * fees.vatBps) / 10_000);
  const total = amount ? amount + premium + vat + auction.shippingCost : 0;
  const tooLow = amount !== null && amount < minimum;

  const submit = async () => {
    if (amount === null) return setError('Introduce un importe válido');
    if (tooLow) return setError(`La puja mínima es ${money(minimum)}`);
    setSubmitting(true);
    setError(null);
    try {
      idempotencyKey.current ??= newIdempotencyKey();
      const res = await api.post<BidResponse>(`/auctions/${auction.id}/bids`, { maxAmount: amount }, { 'Idempotency-Key': idempotencyKey.current });
      void Haptics.notificationAsync(res.winning ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      onPlaced(res);
    } catch (err) {
      if (err instanceof ApiError && typeof err.data.minNextBid === 'number') {
        setInput(centsToInput(err.data.minNextBid));
      }
      // A rejected bid is final for this key; a fresh one allows a corrected retry.
      if (err instanceof ApiError && err.status !== 0) idempotencyKey.current = null;
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="h2">{leading ? 'Subir tu puja máxima' : 'Hacer una puja'}</T>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.textMuted} />
        </Pressable>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="small" color={c.textMuted}>Precio actual</T>
          <T variant="h2">{money(auction.currentPrice)}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T variant="small" color={c.textMuted}>{leading ? 'Tu máximo actual' : 'Puja mínima'}</T>
          <T variant="h2" color={c.primary}>{money(leading && viewer?.myMax ? viewer.myMax : minimum)}</T>
        </View>
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {suggestions.map((s) => (
          <Chip key={s} label={money(s)} selected={amount === s} onPress={() => setInput(centsToInput(s))} />
        ))}
      </ScrollView>

      <Field
        label="Tu puja máxima"
        value={input}
        onChangeText={setInput}
        keyboardType="decimal-pad"
        suffix="€"
        error={tooLow ? `Mínimo ${money(minimum)}` : null}
        style={{ fontSize: 22, fontWeight: '700' }}
      />

      <View style={[styles.info, { backgroundColor: c.primarySoft }]}>
        <Ionicons name="flash" size={18} color={c.primary} />
        <T variant="small" color={c.text} style={{ flex: 1 }}>
          Puja automática: pujaremos por ti lo justo para mantenerte en cabeza, hasta tu máximo. Nadie más lo verá.
        </T>
      </View>

      {amount && !tooLow ? (
        <View style={{ gap: 6 }}>
          <T variant="small" color={c.textMuted}>Si ganas pagando tu máximo:</T>
          <Line label="Puja" value={money(amount)} />
          <Line label={`Comisión del comprador (${fees.buyerPremiumBps / 100} %)`} value={money(premium)} />
          <Line label="IVA sobre la comisión" value={money(vat)} />
          <Line label="Envío" value={auction.shippingCost ? money(auction.shippingCost) : 'Gratis'} />
          <Divider />
          <Line label="Total máximo" value={money(total)} bold />
        </View>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}

      <Button
        title={amount && !tooLow ? `Confirmar puja de ${money(amount)}` : 'Confirmar puja'}
        size="lg"
        icon="hammer"
        loading={submitting}
        disabled={!amount || tooLow}
        onPress={submit}
      />
      <T variant="tiny" color={c.textFaint} style={{ textAlign: 'center' }}>
        Las pujas son vinculantes: si ganas, te comprometes a pagar en 48 horas.
      </T>
    </ScrollView>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T variant={bold ? 'h3' : 'small'} color={bold ? c.text : c.textMuted}>{label}</T>
      <T variant={bold ? 'h3' : 'small'}>{value}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '92%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: spacing.md },
  info: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, alignItems: 'flex-start' },
});

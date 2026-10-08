import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, errorMessage, imageUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useNow, useQuery } from '../../lib/hooks';
import { useAuctionLive } from '../../lib/realtime';
import { AUCTION_STATUS_LABEL, CONDITION_LABEL, dateTime, money, relativeTime, remaining } from '../../lib/format';
import { spacing, useColors } from '../../lib/theme';
import type { AuctionPage, BidResponse } from '../../lib/types';
import { BidSheet } from '../../components/BidSheet';
import { Avatar, Badge, Button, Card, Divider, ErrorBanner, Field, Loading, Row, Stars, T } from '../../components/ui';

const { width: SCREEN_W } = Dimensions.get('window');

export default function AuctionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const page = useQuery(() => api.get<AuctionPage>(`/auctions/${id}`), [id, user?.id]);
  const live = useAuctionLive(
    id,
    (update) => {
      if (page.data && update.currentPrice > page.data.auction.currentPrice) {
        setFlash('up');
        setTimeout(() => setFlash(null), 900);
      }
      page.setData((p) => {
        if (!p) return p;
        return {
          ...p,
          auction: {
            ...p.auction,
            currentPrice: update.currentPrice,
            bidCount: update.bidCount,
            endAt: update.endAt,
            status: update.status,
            reserveMet: update.reserveMet,
            minNextBid: update.minNextBid,
            buyNowAvailable: update.buyNowAvailable,
            seq: update.seq,
          },
        };
      });
      // Bid history, leader flag and order link come from the full page.
      void page.reload();
    },
    () => void page.reload(),
    () => void page.reload(),
  );

  const data = page.data;
  const { setBaseline } = live;
  const baseSeq = data?.auction.seq;
  useEffect(() => {
    if (baseSeq !== undefined) setBaseline(baseSeq);
  }, [baseSeq, setBaseline]);

  const requireLogin = () => {
    if (!user) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const toggleWatch = async () => {
    if (requireLogin() || !data) return;
    const watching = !data.viewer?.watching;
    page.setData({ ...data, viewer: data.viewer ? { ...data.viewer, watching } : data.viewer });
    void Haptics.selectionAsync();
    try {
      if (watching) await api.post(`/auctions/${id}/watch`);
      else await api.del(`/auctions/${id}/watch`);
    } catch (err) {
      page.setData(data);
      Alert.alert('No se pudo actualizar', errorMessage(err));
    }
  };

  const onPlaced = (res: BidResponse) => {
    setSheetOpen(false);
    void page.reload();
    if (res.winning) {
      Alert.alert(
        '¡Vas ganando!',
        `Tu puja máxima es ${money(res.yourMax)}. Precio actual: ${money(res.currentPrice)}.${res.extended ? '\n\nLa subasta se ha ampliado 2 minutos por una puja de última hora.' : ''}`,
      );
    } else {
      Alert.alert('Te han superado al instante', `Otro pujador tenía un máximo mayor. Precio actual: ${money(res.currentPrice)}. ¿Pujas más?`);
    }
  };

  const buyNow = () => {
    if (requireLogin() || !data?.auction.buyNowPrice) return;
    Alert.alert('Compra inmediata', `¿Comprar «${data.auction.title}» por ${money(data.auction.buyNowPrice)} + gastos? La subasta terminará ahora.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Comprar',
        onPress: async () => {
          try {
            const order = await api.post<{ id: string }>(`/auctions/${id}/buy-now`);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push(`/order/${order.id}`);
          } catch (err) {
            Alert.alert('No se pudo comprar', errorMessage(err));
            void page.reload();
          }
        },
      },
    ]);
  };

  const cancel = () => {
    Alert.alert('Cancelar subasta', 'La subasta se retirará. Solo es posible mientras no haya pujas.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar subasta',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/auctions/${id}/cancel`);
            void page.reload();
          } catch (err) {
            Alert.alert('No se pudo cancelar', errorMessage(err));
          }
        },
      },
    ]);
  };

  const share = () => {
    if (!data) return;
    void Share.share({ message: `Mira esta subasta en Subastia: «${data.auction.title}» — ahora a ${money(data.auction.currentPrice)}` });
  };

  const headerRight = useCallback(
    () => (
      <Row gap={spacing.sm}>
        <HeaderButton icon="share-outline" onPress={share} />
        <HeaderButton icon={data?.viewer?.watching ? 'heart' : 'heart-outline'} onPress={toggleWatch} active={!!data?.viewer?.watching} />
      </Row>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.viewer?.watching, data?.auction.id, user?.id],
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 60, padding: spacing.lg }}>
        <Stack.Screen options={{ headerTransparent: false, title: 'Subasta' }} />
        {page.error ? <ErrorBanner message={page.error} onRetry={page.reload} /> : <Loading />}
      </View>
    );
  }

  const { auction, seller, viewer, bids, questions } = data;
  const time = remaining(auction.endAt, now);
  const active = auction.status === 'active' && !time.ended;
  const isSeller = !!viewer?.isSeller;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          headerRight,
          headerLeft: () => <HeaderButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={page.refreshing} onRefresh={page.refresh} tintColor={c.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          <Gallery images={auction.images} />

          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Row>
                <Badge label={CONDITION_LABEL[auction.condition]} />
                {auction.location ? <Badge label={auction.location} icon="location" /> : null}
                {!active ? <Badge label={AUCTION_STATUS_LABEL[auction.status]} tone={auction.status === 'sold' ? 'success' : 'neutral'} /> : null}
              </Row>
              <T variant="title" style={{ fontSize: 24 }}>{auction.title}</T>
            </View>

            {auction.status === 'rejected' && auction.rejectionReason ? <ErrorBanner message={auction.rejectionReason} /> : null}

            <Card style={{ gap: spacing.md }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <T variant="small" color={c.textMuted}>{active ? 'Puja actual' : auction.status === 'sold' ? 'Precio final' : 'Última puja'}</T>
                  <T variant="price" color={flash ? c.success : c.text}>{money(auction.currentPrice, auction.currency)}</T>
                  <T variant="small" color={c.textMuted}>
                    {auction.bidCount} {auction.bidCount === 1 ? 'puja' : 'pujas'}
                    {auction.shippingCost ? ` · + ${money(auction.shippingCost)} envío` : ' · Envío gratis'}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="small" color={c.textMuted}>{active ? 'Termina en' : 'Terminó'}</T>
                  <T variant="h2" color={active && time.urgent ? c.danger : c.text} style={{ fontVariant: ['tabular-nums'] }}>
                    {active ? time.label : relativeTime(auction.endAt, now)}
                  </T>
                  <T variant="tiny" color={c.textFaint}>{dateTime(auction.endAt)}</T>
                </View>
              </Row>

              <Row style={{ flexWrap: 'wrap' }}>
                {auction.hasReserve ? (
                  <Badge label={auction.reserveMet ? 'Reserva alcanzada' : 'Reserva no alcanzada'} tone={auction.reserveMet ? 'success' : 'warning'} icon="shield" />
                ) : (
                  <Badge label="Sin precio de reserva" icon="checkmark" />
                )}
                {viewer?.myMax && !isSeller ? (
                  viewer.isLeading ? (
                    <Badge label={active ? `Vas ganando · tu máx. ${money(viewer.myMax)}` : '¡Has ganado!'} tone="success" icon="trophy" />
                  ) : (
                    <Badge label={active ? `Superado · tu máx. ${money(viewer.myMax)}` : 'No ganaste'} tone="danger" icon="arrow-down" />
                  )
                ) : null}
              </Row>

              {active && auction.buyNowAvailable && auction.buyNowPrice && !isSeller ? (
                <Button title={`Comprar ya por ${money(auction.buyNowPrice)}`} variant="secondary" icon="flash" onPress={buyNow} />
              ) : null}
              {viewer?.orderId ? <Button title="Ver pedido" icon="receipt-outline" onPress={() => router.push(`/order/${viewer.orderId}`)} /> : null}
              {isSeller && active && auction.bidCount === 0 ? <Button title="Cancelar subasta" variant="ghost" onPress={cancel} /> : null}
            </Card>

            <Pressable onPress={() => router.push(`/user/${seller.id}`)}>
              <Card>
                <Row gap={spacing.md}>
                  <Avatar name={seller.displayName} size={44} />
                  <View style={{ flex: 1 }}>
                    <T variant="h3">{seller.displayName}</T>
                    <Row gap={6}>
                      <Stars rating={seller.rating} size={12} />
                      <T variant="small" color={c.textMuted}>
                        {seller.rating ? `${seller.rating} (${seller.ratingCount})` : 'Nuevo'} · {seller.salesCount} ventas
                      </T>
                    </Row>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
                </Row>
              </Card>
            </Pressable>

            <View style={{ gap: spacing.sm }}>
              <T variant="h2">Descripción</T>
              <T color={c.textMuted} style={{ lineHeight: 22 }}>{auction.description}</T>
            </View>

            <Card style={{ gap: spacing.md }}>
              <InfoRow icon="shield-checkmark-outline" title="Compra protegida" text="Pagas a Subastia y liberamos el dinero al vendedor cuando confirmas la entrega." />
              <InfoRow icon="timer-outline" title="Cierre ampliable" text="Si alguien puja en los últimos 2 minutos, el cierre se amplía 2 minutos para que todos puedan responder." />
              <InfoRow icon="card-outline" title={`Comisión del comprador ${data.fees.buyerPremiumBps / 100} %`} text="Se suma al precio final junto con el IVA de la comisión y el envío." />
            </Card>

            <View style={{ gap: spacing.sm }}>
              <T variant="h2">Historial de pujas</T>
              {bids.length === 0 ? (
                <T color={c.textMuted}>Aún no hay pujas. ¡Sé el primero!</T>
              ) : (
                <Card padded={false}>
                  {bids.map((b, i) => (
                    <View key={`${b.createdAt}-${i}`} style={[styles.bidRow, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <Avatar name={b.bidder} size={28} />
                      <View style={{ flex: 1 }}>
                        <T variant="small">{b.bidder}{b.isProxy ? ' · automática' : ''}</T>
                        <T variant="tiny" color={c.textFaint}>{relativeTime(b.createdAt, now)}</T>
                      </View>
                      <T variant="h3" color={i === 0 ? c.success : c.text}>{money(b.amount)}</T>
                    </View>
                  ))}
                </Card>
              )}
            </View>

            <Questions auctionId={auction.id} questions={questions} isSeller={isSeller} canAsk={active && !isSeller} onChange={page.reload} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {active && !isSeller ? (
        <View style={[styles.bottomBar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={{ flex: 1 }}>
            <T variant="tiny" color={c.textMuted}>{viewer?.isLeading ? 'VAS GANANDO' : 'PUJA MÍNIMA'}</T>
            <T variant="h2">{money(viewer?.isLeading ? auction.currentPrice : auction.minNextBid)}</T>
          </View>
          <Button
            title={viewer?.isLeading ? 'Subir máximo' : 'Pujar'}
            icon="hammer"
            size="lg"
            style={{ paddingHorizontal: spacing.xxl }}
            onPress={() => {
              if (!requireLogin()) setSheetOpen(true);
            }}
          />
        </View>
      ) : null}

      <BidSheet visible={sheetOpen} auction={auction} viewer={viewer} fees={data.fees} onClose={() => setSheetOpen(false)} onPlaced={onPlaced} />
    </View>
  );
}

function Gallery({ images }: { images: string[] }) {
  const c = useColors();
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  return (
    <View style={{ width: SCREEN_W, height: SCREEN_W * 0.85, backgroundColor: c.surfaceAlt }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
        {images.map((img) => (
          <Image key={img} source={imageUrl(img)} style={{ width: SCREEN_W, height: SCREEN_W * 0.85 }} contentFit="cover" transition={200} />
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <Row gap={6} style={styles.dots}>
          {images.map((img, i) => (
            <View key={img} style={[styles.dot, { backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.45)', width: i === index ? 18 : 7 }]} />
          ))}
        </Row>
      ) : null}
    </View>
  );
}

function HeaderButton({ icon, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.headerButton}>
      <Ionicons name={icon} size={20} color={active ? '#F87171' : '#fff'} />
    </Pressable>
  );
}

function InfoRow({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const c = useColors();
  return (
    <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={20} color={c.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <T variant="h3">{title}</T>
        <T variant="small" color={c.textMuted}>{text}</T>
      </View>
    </Row>
  );
}

function Questions({
  auctionId,
  questions,
  isSeller,
  canAsk,
  onChange,
}: {
  auctionId: string;
  questions: AuctionPage['questions'];
  isSeller: boolean;
  canAsk: boolean;
  onChange: () => void;
}) {
  const c = useColors();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    try {
      await api.post(`/auctions/${auctionId}/questions`, { question: text });
      setText('');
      onChange();
    } catch (err) {
      Alert.alert('No se pudo enviar', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const answer = async (questionId: string) => {
    try {
      await api.post(`/questions/${questionId}/answer`, { answer: answers[questionId] ?? '' });
      setAnswers((a) => ({ ...a, [questionId]: '' }));
      onChange();
    } catch (err) {
      Alert.alert('No se pudo responder', errorMessage(err));
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <T variant="h2">Preguntas al vendedor</T>
      {questions.length === 0 ? <T color={c.textMuted}>Nadie ha preguntado todavía.</T> : null}
      {questions.map((q) => (
        <Card key={q.id} style={{ gap: spacing.sm }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Ionicons name="help-circle" size={18} color={c.primary} />
            <T style={{ flex: 1 }}>{q.question}</T>
          </Row>
          {q.answer ? (
            <Row style={{ alignItems: 'flex-start' }}>
              <Ionicons name="chatbubble" size={16} color={c.success} />
              <T color={c.textMuted} style={{ flex: 1 }}>{q.answer}</T>
            </Row>
          ) : isSeller ? (
            <View style={{ gap: spacing.sm }}>
              <Field value={answers[q.id] ?? ''} onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} placeholder="Escribe tu respuesta pública" />
              <Button title="Responder" size="sm" onPress={() => answer(q.id)} disabled={!answers[q.id]?.trim()} />
            </View>
          ) : (
            <T variant="small" color={c.textFaint}>Pendiente de respuesta</T>
          )}
          <T variant="tiny" color={c.textFaint}>{q.asker} · {relativeTime(q.createdAt)}</T>
        </Card>
      ))}
      {canAsk ? (
        <View style={{ gap: spacing.sm }}>
          <Field value={text} onChangeText={setText} placeholder="Pregunta algo sobre el artículo…" maxLength={500} />
          <Button title="Enviar pregunta" variant="secondary" size="sm" loading={busy} disabled={text.trim().length < 5} onPress={ask} />
          <T variant="tiny" color={c.textFaint}>Las preguntas y respuestas son públicas. No compartas datos de contacto.</T>
        </View>
      ) : null}
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center' },
  dot: { height: 7, borderRadius: 4 },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,18,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

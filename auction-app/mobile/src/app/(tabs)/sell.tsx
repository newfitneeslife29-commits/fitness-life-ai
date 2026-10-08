import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage, imageUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useQuery } from '../../lib/hooks';
import { CONDITION_LABEL, money, parseMoney } from '../../lib/format';
import { radius, spacing, useColors } from '../../lib/theme';
import type { AuctionDetail, Category, Condition } from '../../lib/types';
import { Button, Card, Chip, EmptyState, ErrorBanner, Field, Row, T } from '../../components/ui';

const DURATIONS = [1, 3, 5, 7, 10];
const MAX_PHOTOS = 10;
// Must match server config (SELLER_FEE_BPS).
const SELLER_FEE = 0.08;

interface Photo {
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: boolean;
}

export default function SellScreen() {
  const { user } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <EmptyState
          icon="pricetag-outline"
          title="Vende al mejor postor"
          message="Publica tu artículo en un par de minutos y deja que los compradores pujen por él."
          action="Iniciar sesión para vender"
          onAction={() => router.push('/login')}
        />
      </View>
    );
  }
  return <SellForm />;
}

function SellForm() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const categories = useQuery(() => api.get<Category[]>('/categories'), [], { refetchOnFocus: false });

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition>('good');
  const [location, setLocation] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [withReserve, setWithReserve] = useState(false);
  const [reservePrice, setReservePrice] = useState('');
  const [withBuyNow, setWithBuyNow] = useState(false);
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [shipping, setShipping] = useState('');
  const [duration, setDuration] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (localUri: string, mimeType?: string | null) => {
    setPhotos((p) => [...p, { localUri, uploading: true }]);
    try {
      const form = new FormData();
      const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      form.append('file', { uri: localUri, name: `photo.${ext}`, type: mimeType ?? 'image/jpeg' } as unknown as Blob);
      const { url } = await api.upload<{ url: string }>('/uploads', form);
      setPhotos((p) => p.map((ph) => (ph.localUri === localUri ? { ...ph, remoteUrl: url, uploading: false } : ph)));
    } catch {
      setPhotos((p) => p.map((ph) => (ph.localUri === localUri ? { ...ph, uploading: false, error: true } : ph)));
    }
  };

  const pick = async (source: 'library' | 'camera') => {
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) return;
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Activa el acceso a la cámara en Ajustes para hacer fotos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });
    }
    if (result.canceled) return;
    for (const asset of result.assets.slice(0, remainingSlots)) void upload(asset.uri, asset.mimeType);
  };

  const removePhoto = (uri: string) => setPhotos((p) => p.filter((ph) => ph.localUri !== uri));

  const start = parseMoney(startPrice);
  const reserve = withReserve ? parseMoney(reservePrice) : null;
  const buyNow = withBuyNow ? parseMoney(buyNowPrice) : null;
  const shippingCents = shipping.trim() === '' ? 0 : parseMoney(shipping);
  const expectedPrice = Math.max(start ?? 0, reserve ?? 0);

  const submit = async () => {
    setError(null);
    const ready = photos.filter((p) => p.remoteUrl);
    if (photos.some((p) => p.uploading)) return setError('Espera a que terminen de subirse las fotos');
    if (ready.length === 0) return setError('Añade al menos una foto');
    if (!categoryId) return setError('Elige una categoría');
    if (start === null) return setError('Indica un precio de salida válido');
    if (withReserve && reserve === null) return setError('Indica un precio de reserva válido');
    if (withBuyNow && buyNow === null) return setError('Indica un precio de compra inmediata válido');
    if (shippingCents === null) return setError('Indica un coste de envío válido');

    setSubmitting(true);
    try {
      const auction = await api.post<AuctionDetail>('/auctions', {
        title,
        description,
        categoryId,
        condition,
        location,
        images: ready.map((p) => p.remoteUrl),
        startingPrice: start,
        reservePrice: reserve,
        buyNowPrice: buyNow,
        shippingCost: shippingCents,
        durationDays: duration,
      });
      if (auction.status === 'rejected') {
        Alert.alert('Anuncio rechazado', auction.rejectionReason ?? 'No cumple las normas de la plataforma.');
        return;
      }
      // Reset and open the new listing.
      setPhotos([]); setTitle(''); setDescription(''); setStartPrice(''); setReservePrice('');
      setBuyNowPrice(''); setShipping(''); setWithReserve(false); setWithBuyNow(false); setCategoryId(null);
      router.push(`/auction/${auction.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, gap: spacing.xl, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <T variant="title">Vender un artículo</T>
          <T color={c.textMuted}>Las subastas con buenas fotos y descripción reciben hasta 3× más pujas.</T>
        </View>

        <Section title="Fotos" subtitle={`${photos.length}/${MAX_PHOTOS} · La primera será la portada`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {photos.length < MAX_PHOTOS ? (
              <>
                <AddPhoto icon="images-outline" label="Galería" onPress={() => pick('library')} />
                <AddPhoto icon="camera-outline" label="Cámara" onPress={() => pick('camera')} />
              </>
            ) : null}
            {photos.map((p, i) => (
              <View key={p.localUri} style={[styles.photo, { backgroundColor: c.surfaceAlt }]}>
                <Image source={p.remoteUrl ? imageUrl(p.remoteUrl) : p.localUri} style={StyleSheet.absoluteFill} contentFit="cover" />
                {p.uploading ? (
                  <View style={[StyleSheet.absoluteFill, styles.photoOverlay]}><ActivityIndicator color="#fff" /></View>
                ) : null}
                {p.error ? (
                  <View style={[StyleSheet.absoluteFill, styles.photoOverlay]}><Ionicons name="warning" size={22} color="#fff" /></View>
                ) : null}
                {i === 0 && !p.error ? <View style={[styles.cover, { backgroundColor: c.primary }]}><T variant="tiny" color="#fff">PORTADA</T></View> : null}
                <Pressable onPress={() => removePhoto(p.localUri)} hitSlop={8} style={styles.remove}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </Section>

        <Section title="Detalles">
          <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ej. Cámara Fujifilm X100V plateada" maxLength={80} hint={`${title.length}/80`} />
          <Field
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            placeholder="Estado, medidas, qué incluye, defectos… Sé honesto: evita disputas."
            multiline
          />
          <T variant="small" color={c.textMuted}>Categoría</T>
          <View style={styles.wrap}>
            {(categories.data ?? []).map((cat) => (
              <Chip key={cat.id} label={cat.name} icon={cat.icon as never} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </View>
          <T variant="small" color={c.textMuted}>Estado</T>
          <View style={styles.wrap}>
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((k) => (
              <Chip key={k} label={CONDITION_LABEL[k]} selected={condition === k} onPress={() => setCondition(k)} />
            ))}
          </View>
          <Field label="Ubicación" value={location} onChangeText={setLocation} placeholder="Ciudad" />
        </Section>

        <Section title="Precio y duración">
          <Field label="Precio de salida" value={startPrice} onChangeText={setStartPrice} keyboardType="decimal-pad" placeholder="0,00" suffix="€" hint="La primera puja debe ser al menos este importe." />
          <ToggleRow
            title="Precio de reserva"
            subtitle="Mínimo oculto. Si no se alcanza, no estás obligado a vender."
            value={withReserve}
            onChange={setWithReserve}
          />
          {withReserve ? <Field value={reservePrice} onChangeText={setReservePrice} keyboardType="decimal-pad" placeholder="0,00" suffix="€" /> : null}
          <ToggleRow
            title="Compra inmediata"
            subtitle="Precio fijo para cerrar la venta al momento, mientras no haya pujas."
            value={withBuyNow}
            onChange={setWithBuyNow}
          />
          {withBuyNow ? <Field value={buyNowPrice} onChangeText={setBuyNowPrice} keyboardType="decimal-pad" placeholder="0,00" suffix="€" /> : null}
          <Field label="Coste de envío" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad" placeholder="0,00 (gratis)" suffix="€" />
          <T variant="small" color={c.textMuted}>Duración</T>
          <Row>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} ${d === 1 ? 'día' : 'días'}`} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </Row>
        </Section>

        {start ? (
          <Card style={{ gap: spacing.sm }}>
            <T variant="h3">Si se vende por {money(expectedPrice)}</T>
            <Row style={{ justifyContent: 'space-between' }}>
              <T color={c.textMuted}>Comisión de venta (8 %)</T>
              <T>−{money(Math.round(expectedPrice * SELLER_FEE))}</T>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h3">Recibirás</T>
              <T variant="h3" color={c.success}>{money(expectedPrice - Math.round(expectedPrice * SELLER_FEE))}</T>
            </Row>
            <T variant="small" color={c.textFaint}>El pago queda protegido y se libera cuando el comprador confirma la entrega.</T>
          </Card>
        ) : null}

        {error ? <ErrorBanner message={error} /> : null}
        <Button title="Publicar subasta" icon="rocket-outline" size="lg" loading={submitting} onPress={submit} />
        <T variant="small" color={c.textFaint} style={{ textAlign: 'center' }}>
          Al publicar aceptas que las pujas son vinculantes y que el artículo cumple las normas de la plataforma.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.md }}>
      <View>
        <T variant="h2">{title}</T>
        {subtitle ? <T variant="small" color={c.textFaint}>{subtitle}</T> : null}
      </View>
      {children}
    </View>
  );
}

function AddPhoto({ icon, label, onPress }: { icon: 'images-outline' | 'camera-outline'; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.photo, styles.add, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Ionicons name={icon} size={26} color={c.primary} />
      <T variant="small" color={c.primary}>{label}</T>
    </Pressable>
  );
}

function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Row gap={spacing.md}>
      <View style={{ flex: 1 }}>
        <T variant="h3">{title}</T>
        <T variant="small" color={c.textMuted}>{subtitle}</T>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary }} />
    </Row>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 104, height: 104, borderRadius: radius.md, overflow: 'hidden' },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed' },
  photoOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cover: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

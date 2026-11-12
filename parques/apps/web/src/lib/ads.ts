/**
 * Anuncios con premio (AdMob) para conseguir monedas cuando se acaban.
 * Solo en las apps de iOS/Android. Sin ids propios se usan los anuncios de prueba de Google.
 * Anuncios no personalizados (npa): no se necesita pedir permiso de rastreo.
 */
import { Capacitor } from '@capacitor/core';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { tr } from './i18n';

const TEST_IDS = { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' };

let ready: Promise<boolean> | null = null;

export const adsAvailable = () => Capacitor.isNativePlatform();

function unitId(): { id: string; testing: boolean } {
  const ios = Capacitor.getPlatform() === 'ios';
  const own = (ios ? import.meta.env.VITE_ADMOB_REWARDED_IOS : import.meta.env.VITE_ADMOB_REWARDED_ANDROID) as string | undefined;
  return own ? { id: own, testing: false } : { id: ios ? TEST_IDS.ios : TEST_IDS.android, testing: true };
}

async function admob() {
  const mod = await import('@capacitor-community/admob');
  if (!ready) {
    ready = mod.AdMob.initialize({})
      .then(() => true)
      .catch(() => false);
  }
  return (await ready) ? mod.AdMob : null;
}

/** Muestra un anuncio con premio; si se ve completo, el servidor entrega las monedas. */
export async function watchAdForCoins(): Promise<boolean> {
  const fx = useFx.getState();
  if (!adsAvailable()) {
    fx.toast({ icon: '📱', title: tr('Los anuncios con premio están en la app del celular') });
    return false;
  }
  try {
    const ad = await admob();
    if (!ad) throw new Error('admob');
    const { id, testing } = unitId();
    await ad.prepareRewardVideoAd({ adId: id, isTesting: testing, npa: true });
    const reward = await ad.showRewardVideoAd();
    if (!reward) return false;
  } catch {
    fx.toast({ icon: '📺', title: tr('No hay anuncios disponibles ahora, intenta en un rato') });
    return false;
  }
  const r = await useProfile.getState().watchedAd();
  if (r.ok && r.result) {
    fx.toast({ icon: '🪙', title: tr('+{n} monedas', { n: r.result.coins }), sub: tr('Te quedan {n} anuncios hoy', { n: r.result.left }) });
    return true;
  }
  fx.toast({ icon: '⚠️', title: tr(r.error ?? 'No se pudo') });
  return false;
}

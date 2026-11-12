/**
 * Iniciar sesión con Apple o Google (apps de iOS/Android).
 * El celular obtiene el token de identidad y el SERVIDOR lo verifica con las llaves de Apple/Google:
 * si esa cuenta ya existe entra a ella (otro celular), si no la vincula a la cuenta actual.
 */
import { Capacitor } from '@capacitor/core';
import { useOnline } from './online';
import { useFx } from '../stores/fxStore';
import { tr } from './i18n';

const GOOGLE_WEB = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;
const GOOGLE_IOS = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;

/** Proveedores disponibles en este dispositivo. */
export function providers(): ('apple' | 'google')[] {
  if (!Capacitor.isNativePlatform()) return [];
  const out: ('apple' | 'google')[] = [];
  if (Capacitor.getPlatform() === 'ios') out.push('apple');
  if (GOOGLE_WEB && (Capacitor.getPlatform() === 'android' || GOOGLE_IOS)) out.push('google');
  return out;
}

let initialized: Promise<void> | null = null;

async function plugin() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!initialized) {
    initialized = SocialLogin.initialize({
      apple: { clientId: 'parques.app', redirectUrl: '' },
      ...(GOOGLE_WEB ? { google: { webClientId: GOOGLE_WEB, iOSClientId: GOOGLE_IOS, iOSServerClientId: GOOGLE_WEB, mode: 'online' as const } } : {}),
    });
  }
  await initialized;
  return SocialLogin;
}

/** Inicia sesión / vincula. Devuelve true si salió bien. */
export async function signIn(provider: 'apple' | 'google'): Promise<boolean> {
  const fx = useFx.getState();
  let idToken: string | null = null;
  let name: string | undefined;
  try {
    const sl = await plugin();
    const res = await sl.login(provider === 'apple' ? { provider: 'apple', options: { scopes: ['name', 'email'] } } : { provider: 'google', options: {} });
    const r = res.result as { idToken?: string | null; profile?: { givenName?: string | null; name?: string | null } };
    idToken = r.idToken ?? null;
    name = r.profile?.givenName ?? r.profile?.name ?? undefined;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (!/cancel/i.test(msg)) fx.toast({ icon: '⚠️', title: tr('No se pudo iniciar sesión') });
    return false;
  }
  if (!idToken) {
    fx.toast({ icon: '⚠️', title: tr('No se pudo iniciar sesión') });
    return false;
  }
  const r = await useOnline.getState().signInWith(provider, idToken, name);
  if (r.error) {
    fx.toast({ icon: '⚠️', title: tr(r.error) });
    return false;
  }
  fx.toast({ icon: '✅', title: r.switched ? tr('Entraste a tu cuenta') : tr('Cuenta vinculada: tu progreso queda guardado') });
  return true;
}

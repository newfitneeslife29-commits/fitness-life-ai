/**
 * Notificaciones locales (v1.2, solo en las apps): recordatorios que programa el propio celular
 * al salir de la app — regalo diario listo, racha en peligro, cofre de victorias para abrir y
 * "te extrañamos". No necesitan servidor (las push remotas requieren Firebase/APNs).
 */
import { Capacitor } from '@capacitor/core';
import { dailyStatus, dayKey } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useApp } from '../stores/appStore';
import { tr } from './i18n';

const IDS = [101, 102, 103, 104];

/** Próxima vez que el reloj marque `hour` (hoy si aún no pasa, si no mañana), con días extra. */
function at(hour: number, extraDays = 0): Date {
  const d = new Date();
  d.setHours(hour, Math.floor(Math.random() * 20), 0, 0);
  if (d.getTime() <= Date.now() + 60_000) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + extraDays);
  return d;
}

/** Arma la lista de recordatorios según el perfil (pura, se prueba en notify.test.ts). */
export function plannedReminders(p: { daily: { lastClaim: string | null; streak: number }; winChest: { ready: number } }, today = dayKey()) {
  const out: { id: number; title: string; body: string; at: Date }[] = [];
  const st = dailyStatus(p.daily.lastClaim, p.daily.streak, today);
  out.push({
    id: 101,
    title: tr('🎁 ¡Tu regalo diario está listo!'),
    body: tr('Entra y reclama tus monedas del día, ¡no dejes que se enfríe!'),
    at: st.canClaim ? at(19) : at(10, 0),
  });
  if (p.daily.streak >= 2) {
    out.push({ id: 102, title: tr('🔥 ¡No pierdas tu racha!'), body: tr('Llevas {n} días seguidos. Entra hoy para no perderla.', { n: p.daily.streak }), at: at(21) });
  }
  if (p.winChest.ready > 0) {
    out.push({ id: 103, title: tr('🧰 Tienes un cofre de victorias'), body: tr('Ábrelo y llévate monedas y gemas.'), at: new Date(Date.now() + 2 * 3600_000) });
  }
  out.push({ id: 104, title: tr('🎲 ¡Te extrañamos en la mesa!'), body: tr('Tus rivales te están esperando. ¿Echamos una partida?'), at: at(18, 3) });
  return out;
}

async function plugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return (await import('@capacitor/local-notifications')).LocalNotifications;
  } catch {
    return null;
  }
}

/** Reprograma los recordatorios (se llama al pasar la app a segundo plano). */
export async function scheduleReminders() {
  const ln = await plugin();
  if (!ln) return;
  await ln.cancel({ notifications: IDS.map((id) => ({ id })) }).catch(() => {});
  if (!useSettings.getState().notifications) return;
  const perm = await ln.checkPermissions().catch(() => null);
  if (perm?.display !== 'granted') return;
  const p = useProfile.getState();
  await ln
    .schedule({ notifications: plannedReminders(p).map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true } })) })
    .catch(() => {});
}

/** Pide el permiso (una vez, cuando la persona ya conoce el juego). */
export async function askNotificationPermission(): Promise<boolean> {
  const ln = await plugin();
  if (!ln) return false;
  const cur = await ln.checkPermissions().catch(() => null);
  if (cur?.display === 'granted') return true;
  if (cur?.display === 'denied') return false;
  const r = await ln.requestPermissions().catch(() => null);
  return r?.display === 'granted';
}

let started = false;
export function startNotifications() {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;
  void (async () => {
    const ln = await plugin();
    if (!ln) return;
    // Tocar la notificación abre el inicio.
    void ln.addListener('localNotificationActionPerformed', () => {
      if (useApp.getState().screen !== 'game') useApp.getState().go('lobby');
    });
    const { App } = await import('@capacitor/app');
    void App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) void scheduleReminders();
    });
  })();
}

/** En el inicio, la primera vez: pide el permiso de notificaciones (una sola vez). */
export function askNotificationsOnce() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (localStorage.getItem('parques-notif-asked')) return;
    localStorage.setItem('parques-notif-asked', '1');
  } catch {
    return;
  }
  setTimeout(() => void askNotificationPermission(), 3000);
}

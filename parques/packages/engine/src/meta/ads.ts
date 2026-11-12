/**
 * Monedas por ver anuncios: para quien se quedó sin monedas.
 * El servidor entrega las monedas (límite por día y espera entre anuncios).
 */

/** Monedas por cada anuncio visto completo. */
export const AD_COINS = 300;
/** Anuncios con premio por día. */
export const AD_DAILY_LIMIT = 8;
/** Espera mínima entre dos anuncios (ms). */
export const AD_COOLDOWN_MS = 25_000;
/** Solo se ofrecen cuando las monedas no alcanzan para la mesa Ciudad. */
export const AD_MAX_BALANCE = 1000;

export interface AdsState {
  day: string;
  count: number;
  lastAt: number;
}

export const EMPTY_ADS: AdsState = { day: '', count: 0, lastAt: 0 };

export function adStatus(coins: number, ads: AdsState, today: string, now: number): { available: boolean; left: number; waitMs: number; reason: string | null } {
  const used = ads.day === today ? ads.count : 0;
  const left = Math.max(0, AD_DAILY_LIMIT - used);
  const waitMs = Math.max(0, ads.lastAt + AD_COOLDOWN_MS - now);
  const reason =
    coins >= AD_MAX_BALANCE ? 'Los anuncios con premio son para cuando te quedas sin monedas' : left <= 0 ? 'Ya viste todos los anuncios de hoy' : waitMs > 0 ? 'Espera un momento para el siguiente anuncio' : null;
  return { available: reason === null, left, waitMs, reason };
}

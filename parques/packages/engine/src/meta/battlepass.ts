/**
 * Pase de batalla mensual: 50 niveles con camino gratis y camino Premium
 * (el Premium se compra con dinero real). Se sube con la XP de las partidas.
 */
import { activeSeason } from './seasons';

export const PASS_TIERS = 50;
export const PASS_XP_PER_TIER = 150;

export interface PassReward {
  coins?: number;
  gems?: number;
  itemId?: string;
  label: string;
  icon: string;
}

export function passSeasonId(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function passSeasonName(d = new Date(), loc = 'es-CO'): string {
  const s = activeSeason(d);
  const month = d.toLocaleDateString(loc, { month: 'long' });
  const name = month.charAt(0).toUpperCase() + month.slice(1);
  return s ? `${s.emoji} ${name}` : name;
}

export function passEndsAt(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

const PREMIUM_ITEMS: Record<number, [string, string, string]> = {
  10: ['pieces-corona', 'Fichas Corona real', '👑'],
  20: ['dice-rubi', 'Dados Rubí', '❤️'],
  30: ['frame-diamante', 'Marco Diamante', '💠'],
  40: ['board-esmeralda', 'Tablero Esmeralda', '💚'],
  50: ['board-galaxia', 'Tablero Galaxia', '🌌'],
};

export function freeReward(tier: number): PassReward {
  if (tier % 5 === 0) return { gems: 2, label: '2 gemas', icon: '💎' };
  const coins = 100 + tier * 10;
  return { coins, label: `${coins} monedas`, icon: '🪙' };
}

export function premiumReward(tier: number): PassReward {
  const it = PREMIUM_ITEMS[tier];
  if (it) return { itemId: it[0], label: it[1], icon: it[2] };
  if (tier % 5 === 0) return { gems: 10, label: '10 gemas', icon: '💎' };
  if (tier % 3 === 0) return { gems: 4, label: '4 gemas', icon: '💎' };
  const coins = 300 + tier * 30;
  return { coins, label: `${coins} monedas`, icon: '🪙' };
}

export function tierFromXp(xp: number): number {
  return Math.min(PASS_TIERS, Math.floor(xp / PASS_XP_PER_TIER));
}

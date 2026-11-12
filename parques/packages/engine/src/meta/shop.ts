/**
 * Funciones extra de la tienda: ofertas del día, cofres sorpresa con gemas y cambio de gemas por monedas.
 * Todo determinista por día para que el cliente y el servidor vean lo mismo.
 */
import { ITEMS, type Item } from './catalog';

/** Descuento de las ofertas del día (0.4 = 40 % menos). */
export const DEAL_DISCOUNT = 0.4;
export const DEALS_PER_DAY = 3;

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Objetos que se venden con monedas (los únicos que pueden estar en oferta o salir en cofres). */
export const COIN_ITEMS: Item[] = ITEMS.filter((i) => i.currency === 'coins' && !i.season);

export interface Deal {
  itemId: string;
  price: number;
  was: number;
}

/** Ofertas del día: 3 objetos de monedas con 40 % de descuento. */
export function dailyDeals(day: string): Deal[] {
  const pool = [...COIN_ITEMS];
  const out: Deal[] = [];
  let h = hash(`deals:${day}`);
  while (out.length < Math.min(DEALS_PER_DAY, pool.length)) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const [it] = pool.splice(h % pool.length, 1);
    out.push({ itemId: it!.id, was: it!.price, price: Math.round((it!.price * (1 - DEAL_DISCOUNT)) / 100) * 100 });
  }
  return out;
}

export interface ChestDef {
  id: string;
  name: string;
  emoji: string;
  gems: number;
  /** Monedas que entrega si ya tienes todo lo que puede salir. */
  coinsIfComplete: number;
  /** Monedas extra que siempre trae. */
  bonusCoins: [number, number];
}

export const CHESTS: ChestDef[] = [
  { id: 'cofre-bronce', name: 'Cofre de barrio', emoji: '📦', gems: 15, coinsIfComplete: 6000, bonusCoins: [300, 1500] },
  { id: 'cofre-oro', name: 'Cofre dorado', emoji: '🧰', gems: 40, coinsIfComplete: 18000, bonusCoins: [2000, 6000] },
];

/** Resultado de abrir un cofre: un objeto que no tienes (si queda alguno) + monedas. */
export function chestRoll(chest: ChestDef, owned: string[], random: number, random2: number): { itemId: string | null; coins: number } {
  const pool = COIN_ITEMS.filter((i) => !owned.includes(i.id));
  // El cofre dorado da objetos más caros con más probabilidad.
  const weighted = pool.flatMap((i) => Array(chest.id === 'cofre-oro' ? Math.max(1, Math.round(i.price / 5000)) : 1).fill(i.id) as string[]);
  const [lo, hi] = chest.bonusCoins;
  const bonus = Math.round((lo + (hi - lo) * random2) / 50) * 50;
  if (!weighted.length) return { itemId: null, coins: chest.coinsIfComplete + bonus };
  return { itemId: weighted[Math.floor(random * weighted.length) % weighted.length]!, coins: bonus };
}

/** Cambio de gemas por monedas. */
export const GEM_EXCHANGE: { gems: number; coins: number }[] = [
  { gems: 10, coins: 2000 },
  { gems: 50, coins: 11000 },
  { gems: 200, coins: 50000 },
];

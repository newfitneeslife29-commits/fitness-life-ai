import { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

// Búfer de valores aleatorios: pedirlos de uno en uno a `crypto` es lento.
const pool = new Uint32Array(1024);
let poolIndex = pool.length;

function nextUint32(): number {
  if (poolIndex >= pool.length) {
    crypto.getRandomValues(pool);
    poolIndex = 0;
  }
  return pool[poolIndex++];
}

/** Entero uniforme en [0, max) sin sesgo de módulo. */
export function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  let x: number;
  do {
    x = nextUint32();
  } while (x >= limit);
  return x % max;
}

/** Barajado Fisher–Yates con RNG criptográfico. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

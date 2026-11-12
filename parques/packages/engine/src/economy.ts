/**
 * Economía compartida (cliente y servidor): mesas, reparto de premios, niveles/XP
 * y productos que se pagan con dinero real. Funciones puras y probadas.
 */

// ---------------------------------------------------------------- Niveles

export const MAX_LEVEL = 500;
/** XP total necesaria para llegar al nivel máximo (100·499 + 50·499² = 12.499.950). */
export const TOTAL_XP = 100 * (MAX_LEVEL - 1) + 50 * (MAX_LEVEL - 1) ** 2;

/**
 * XP acumulada para ESTAR en el nivel `level` (nivel 1 = 0).
 * cum(L) = 100·(L−1) + 50·(L−1)²  → del 1 al 2 se necesitan 150 XP (3 partidas de 50)
 * y cada nivel pide 100 XP más que el anterior. El nivel máximo es el 500.
 */
export function xpToReach(level: number): number {
  const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const n = L - 1;
  return 100 * n + 50 * n * n;
}

/** XP necesaria para pasar de `level` a `level + 1`. */
export function xpForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return xpToReach(level + 1) - xpToReach(level);
}

export function levelFromXp(xp: number): { level: number; into: number; need: number; max: boolean } {
  const x = Math.max(0, Math.floor(xp));
  if (x >= TOTAL_XP) return { level: MAX_LEVEL, into: 0, need: 0, max: true };
  // Resolver 50n² + 100n ≤ x  →  n = floor((−100 + √(10000 + 200x)) / 100)
  let n = Math.floor((-100 + Math.sqrt(10000 + 200 * x)) / 100);
  while (n > 0 && 100 * n + 50 * n * n > x) n--;
  while (100 * (n + 1) + 50 * (n + 1) * (n + 1) <= x && n + 2 < MAX_LEVEL) n++;
  const level = Math.min(MAX_LEVEL - 1, n + 1);
  return { level, into: x - xpToReach(level), need: xpForLevel(level), max: false };
}

/** Monedas por subir a `level` (las gemas solo se ganan ganando partidas o con el pase). */
export function levelReward(level: number): { coins: number } {
  return { coins: Math.min(5000, 100 + level * 20) };
}

// ---------------------------------------------------------------- Mesas

export type TableId = 'barrio' | 'ciudad' | 'capital' | 'leyenda' | 'elite' | 'top';

export interface TableTier {
  id: TableId;
  name: string;
  /** Lo que paga CADA jugador para entrar. */
  entry: number;
  minLevel: number;
  /** Solo para el top del ranking (sala Top Leyendas). */
  topOnly?: boolean;
  /** Solo online. */
  onlineOnly?: boolean;
  ai: 'easy' | 'normal' | 'expert';
  turnSeconds: number;
  emoji: string;
  blurb: string;
}

export const TABLES: TableTier[] = [
  { id: 'barrio', name: 'Barrio', entry: 200, minLevel: 1, ai: 'easy', turnSeconds: 20, emoji: '🏘️', blurb: 'La mesa de la cuadra, pa\' calentar.' },
  { id: 'ciudad', name: 'Ciudad', entry: 1000, minLevel: 5, ai: 'normal', turnSeconds: 20, emoji: '🏙️', blurb: 'Aquí ya se juega en serio.' },
  { id: 'capital', name: 'Capital', entry: 5000, minLevel: 20, ai: 'expert', turnSeconds: 20, emoji: '🏛️', blurb: 'Solo pa\' los berracos.' },
  { id: 'leyenda', name: 'Leyenda', entry: 25000, minLevel: 50, ai: 'expert', turnSeconds: 20, emoji: '👑', blurb: 'Donde se coronan las leyendas.' },
  { id: 'elite', name: 'Sala Élite', entry: 100000, minLevel: 200, ai: 'expert', turnSeconds: 20, emoji: '💎', blurb: 'Solo jugadores de nivel 200 o más.' },
  { id: 'top', name: 'Top Leyendas', entry: 250000, minLevel: 300, topOnly: true, onlineOnly: true, ai: 'expert', turnSeconds: 20, emoji: '🔥', blurb: 'Solo los 100 mejores del ranking, desde nivel 300.' },
];

/** Cupos de la sala Top Leyendas (puestos del ranking global). */
export const TOP_ROOM_SIZE = 100;

export function table(id: TableId | null | undefined): TableTier | undefined {
  return TABLES.find((t) => t.id === id);
}

// ---------------------------------------------------------------- Reparto del premio

/** Parte del dinero de los perdedores que se reparte a los ganadores (el resto es la comisión de la casa). */
export const WINNERS_SHARE = 0.75;

/**
 * Lo que recibe cada puesto (incluye su propia entrada si la recupera).
 *  - 4 jugadores: 1º = su entrada + 75 % de las entradas del 3º y 4º; 2º recupera su entrada; 3º y 4º nada.
 *  - 6 jugadores: ganan 1º, 2º y 3º: 1º = entrada + 50 % de las entradas del 4º–6º, 2º = entrada + 25 %,
 *    3º recupera su entrada; 4º–6º nada.
 *  - 3 jugadores: 1º = entrada + 75 % de la del 3º; 2º recupera; 3º nada.
 *  - 2 jugadores (1 vs 1): 1º = entrada + 75 % de la del rival.
 *  - Parejas 2 vs 2: cada ganador = su entrada + 75 % de una entrada rival.
 */
export function payouts(entry: number, players: number, teams = false): number[] {
  const e = Math.max(0, Math.floor(entry));
  if (teams) return [e + Math.floor(e * WINNERS_SHARE), e + Math.floor(e * WINNERS_SHARE), 0, 0];
  if (players <= 2) return [e + Math.floor(e * WINNERS_SHARE), 0];
  if (players === 3) return [e + Math.floor(e * WINNERS_SHARE), e, 0];
  if (players <= 5) {
    const losers = players - 2;
    return [e + Math.floor(losers * e * WINNERS_SHARE), e, ...Array(losers).fill(0)];
  }
  const losers = players - 3;
  const pot = losers * e;
  return [e + Math.floor(pot * 0.5), e + Math.floor(pot * 0.25), e, ...Array(losers).fill(0)];
}

/** Gemas para el primer puesto de una mesa con apuesta. */
export const WINNER_GEMS = 5;

/**
 * XP de una partida: pocas. En una mesa de 200 el ganador recibe 50 XP;
 * en mesas más caras sube con la raíz de la entrada. Práctica gratis: 10 XP.
 */
export function matchXp(entry: number, place: number): number {
  const base = entry > 0 ? Math.round(50 * Math.sqrt(entry / 200)) : 10;
  const factor = place === 0 ? 1 : place === 1 ? 0.8 : 0.6;
  return Math.max(1, Math.round(base * factor));
}

// ---------------------------------------------------------------- Productos con dinero real

export type ProductKind = 'coins' | 'gems' | 'item' | 'pass' | 'bundle';

export interface Product {
  id: string;
  kind: ProductKind;
  /** Precio en centavos de dólar. */
  usdCents: number;
  name: string;
  coins?: number;
  gems?: number;
  /** Objeto de la tienda que entrega (id del catálogo). */
  itemId?: string;
  /** Pase de batalla: niveles extra incluidos. */
  passTiers?: number;
  /** Paquete: objetos incluidos. */
  itemIds?: string[];
  /** Solo se ofrece una vez por cuenta. */
  once?: boolean;
  /** Texto destacado ("Más vendido", "-70 %"…). */
  badge?: string;
}

export const PRODUCTS: Product[] = [
  { id: 'coins-s', kind: 'coins', usdCents: 99, name: '5.000 monedas', coins: 5000 },
  { id: 'coins-m', kind: 'coins', usdCents: 499, name: '30.000 monedas', coins: 30000 },
  { id: 'coins-l', kind: 'coins', usdCents: 999, name: '70.000 monedas', coins: 70000 },
  { id: 'coins-xl', kind: 'coins', usdCents: 1999, name: '160.000 monedas', coins: 160000 },
  { id: 'coins-xxl', kind: 'coins', usdCents: 4999, name: '500.000 monedas', coins: 500000 },
  { id: 'gems-s', kind: 'gems', usdCents: 99, name: '20 gemas', gems: 20 },
  { id: 'gems-m', kind: 'gems', usdCents: 499, name: '120 gemas', gems: 120 },
  { id: 'gems-l', kind: 'gems', usdCents: 999, name: '260 gemas', gems: 260 },
  { id: 'gems-xl', kind: 'gems', usdCents: 1999, name: '600 gemas', gems: 600, badge: 'Mejor precio' },
  { id: 'bundle-inicio', kind: 'bundle', usdCents: 199, name: 'Paquete de bienvenida', coins: 25000, gems: 60, itemIds: ['board-playa'], once: true, badge: '-80 %' },
  { id: 'bundle-semana', kind: 'bundle', usdCents: 499, name: 'Combo parcero', coins: 60000, gems: 80, itemIds: ['dice-galaxia'], badge: 'Más vendido' },
  { id: 'bundle-leyenda', kind: 'bundle', usdCents: 1499, name: 'Paquete Leyenda', coins: 250000, gems: 300, itemIds: ['board-guatape', 'pieces-tricolor', 'frame-neon'], badge: 'Todo incluido' },
  { id: 'pass-premium', kind: 'pass', usdCents: 499, name: 'Pase Premium', passTiers: 0 },
  { id: 'pass-elite', kind: 'pass', usdCents: 999, name: 'Pase Élite (+10 niveles)', passTiers: 10 },
];

/** Precio de un objeto de la tienda en dinero real (centavos). Se agrega a PRODUCTS al vuelo. */
export const ITEM_PRICES_USD: Record<string, number> = {
  'board-caribe': 199,
  'board-noche': 299,
  'board-madera': 299,
  'board-marmol': 499,
  'board-oro': 999,
  'board-feria': 299,
  'board-carnaval': 299,
  'board-navidad': 299,
  'dice-cafe': 99,
  'dice-neon': 149,
  'dice-cristal': 199,
  'dice-navidad': 99,
  'dice-carnaval': 99,
  'dice-feria': 99,
  'pieces-gema': 199,
  'pieces-brillante': 149,
  'pieces-cristal': 299,
  'pieces-estrella': 99,
  'frame-vueltiao': 99,
  'frame-tricolor': 99,
  'frame-fuego': 199,
  'frame-navidad': 99,
  'effect-confeti': 99,
  'effect-pólvora': 199,
  'effect-nieve': 99,
  'board-playa': 299,
  'board-cartagena': 399,
  'board-selva': 399,
  'board-salsa': 299,
  'board-guatape': 499,
  'dice-galaxia': 199,
  'dice-lava': 149,
  'pieces-tricolor': 199,
  'frame-arcoiris': 149,
  'frame-neon': 199,
  'effect-rayos': 199,
  'board-teyuna': 499,
  'board-cano': 399,
  'board-ballenas': 299,
  'board-tayrona': 299,
  'board-paramo': 399,
  'board-mompox': 299,
  'board-sal': 499,
  'dice-mochila': 149,
  'dice-oro3d': 199,
  'dice-marmol3d': 149,
  'dice-hielo': 99,
  'dice-mola': 149,
  'dice-volcan': 199,
  'pieces-muisca': 299,
  'pieces-vueltiao': 199,
  'pieces-chiva': 299,
  'pieces-gema3d': 299,
  'avatar-palenquera': 99,
  'avatar-marimonda': 99,
  'avatar-vallenatero': 149,
  'avatar-cumbiambera': 149,
  'avatar-wayuu': 149,
  'avatar-pescador': 99,
  'avatar-futbolista': 199,
  'avatar-abuela': 99,
  'avatar-chivero': 149,
  'avatar-salsero': 149,
  'avatar-tejo': 99,
  'avatar-congo': 199,
};

export function productFor(id: string): Product | undefined {
  const p = PRODUCTS.find((x) => x.id === id);
  if (p) return p;
  if (id.startsWith('item:')) {
    const itemId = id.slice(5);
    const cents = ITEM_PRICES_USD[itemId];
    if (cents) return { id, kind: 'item', usdCents: cents, name: itemId, itemId };
  }
  return undefined;
}

export function formatUsd(cents: number): string {
  return `US$${(cents / 100).toFixed(2)}`;
}

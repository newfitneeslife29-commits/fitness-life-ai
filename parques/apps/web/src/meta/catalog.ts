/**
 * Catálogo de la tienda: tableros, dados, fichas, marcos de avatar y efectos de captura.
 * La mayoría se compran con dinero real (precio en ITEM_PRICES_USD del motor), unos pocos con
 * monedas del juego y otros solo se consiguen en el Pase de batalla.
 */
import { ITEM_PRICES_USD } from '@parques/engine';
import type { Season } from './seasons';

export type Category = 'board' | 'dice' | 'pieces' | 'frame' | 'effect';
export type Currency = 'coins' | 'usd' | 'pass' | 'free';

export interface BoardTheme {
  frame: string;
  frameDark: string;
  /** Color del canto del tablero (grosor 3D). */
  slab: string;
  sky: [string, string, string];
  circle: [string, string];
  line: string;
  tint: number;
  /** Color de las casillas claras (por defecto blanco teñido). */
  cell?: string;
  deco: 'clouds' | 'flowers' | 'snow' | 'coffee' | 'confetti' | 'stars' | 'gold' | 'marble' | 'wood';
  /** Fondo de la pantalla de juego. */
  page: [string, string];
}

export interface DiceSkin {
  face: [string, string];
  pip: string;
  one: string;
  edge?: string;
}

export type PieceStyle = 'clasica' | 'gema' | 'brillante' | 'moneda' | 'estrella' | 'cristal' | 'corona';
export type EffectStyle = 'stars' | 'flowers' | 'confetti' | 'fireworks' | 'snow';

export interface FrameSkin {
  ring: [string, string];
  ornament: string | null;
}

export interface Item {
  id: string;
  category: Category;
  name: string;
  currency: Currency;
  /** Monedas (si currency = coins). */
  price: number;
  season?: Season['id'];
  board?: BoardTheme;
  dice?: DiceSkin;
  pieces?: PieceStyle;
  frame?: FrameSkin;
  effect?: EffectStyle;
  emoji: string;
}

type Raw = Omit<Item, 'currency' | 'price'> & { coins?: number; passOnly?: boolean };

const RAW: Raw[] = [
  // Tableros
  { id: 'board-clasico', category: 'board', name: 'Clásico', emoji: '☁️',
    board: { frame: '#1446b8', frameDark: '#071a4d', slab: '#0b2a75', sky: ['#c9ecff', '#5fb4f2', '#2f86e0'], circle: ['#9adaff', '#1e88e5'], line: '#13254f', tint: 16, deco: 'clouds', page: ['#2a1660', '#120c2e'] } },
  { id: 'board-cafetero', category: 'board', name: 'Eje Cafetero', coins: 15000, emoji: '☕',
    board: { frame: '#6b4423', frameDark: '#2e1b0b', slab: '#3d2512', sky: ['#f6e7c8', '#c8a273', '#8a5a2b'], circle: ['#d9b48a', '#7a4a22'], line: '#3b2412', tint: 20, deco: 'coffee', page: ['#4a2c16', '#1e1008'] } },
  { id: 'board-caribe', category: 'board', name: 'Caribe', emoji: '🏝️',
    board: { frame: '#0e8c96', frameDark: '#064a50', slab: '#075a62', sky: ['#c9fbff', '#42d6df', '#0aa6b5'], circle: ['#ffe7a3', '#ffb347'], line: '#0b3d44', tint: 14, deco: 'stars', page: ['#0b5560', '#06222a'] } },
  { id: 'board-madera', category: 'board', name: 'Madera fina', emoji: '🪵',
    board: { frame: '#8a5a2b', frameDark: '#3b230d', slab: '#5c3a17', sky: ['#f3d9a8', '#c99a5b', '#9a6a33'], circle: ['#e8c48c', '#8a5a2b'], line: '#3b230d', tint: 22, cell: '#fbefd8', deco: 'wood', page: ['#3b2410', '#140b04'] } },
  { id: 'board-noche', category: 'board', name: 'Noche de rumba', emoji: '🌃',
    board: { frame: '#2a1460', frameDark: '#0a0520', slab: '#140a33', sky: ['#5a2ea6', '#2a1460', '#140a33'], circle: ['#ff4fd8', '#4b1fa3'], line: '#0a0520', tint: 22, deco: 'stars', page: ['#2a0f55', '#08031a'] } },
  { id: 'board-marmol', category: 'board', name: 'Mármol real', emoji: '🏛️',
    board: { frame: '#e8e4dc', frameDark: '#8a8478', slab: '#b7b0a2', sky: ['#ffffff', '#e9e6df', '#c9c3b6'], circle: ['#ffffff', '#cfc8b8'], line: '#4a4438', tint: 12, cell: '#fdfcf8', deco: 'marble', page: ['#3a3a44', '#121218'] } },
  { id: 'board-oro', category: 'board', name: 'Oro 24K', emoji: '🏆',
    board: { frame: '#e0a400', frameDark: '#7a5200', slab: '#a87400', sky: ['#fff6c8', '#ffd54a', '#e09b00'], circle: ['#fff3b0', '#d48a00'], line: '#5a3a00', tint: 14, cell: '#fffaf0', deco: 'gold', page: ['#3a2600', '#120b00'] } },
  { id: 'board-feria', category: 'board', name: 'Feria de las Flores', season: 'feria', emoji: '🌸',
    board: { frame: '#1f7a3a', frameDark: '#0f4720', slab: '#145a2b', sky: ['#ffe3f1', '#ff9fcf', '#e8559b'], circle: ['#fff1a8', '#ff8ac6'], line: '#2b1440', tint: 16, deco: 'flowers', page: ['#5a1a45', '#1d0818'] } },
  { id: 'board-carnaval', category: 'board', name: 'Carnaval', season: 'carnaval', emoji: '🎭',
    board: { frame: '#c2185b', frameDark: '#6b0d33', slab: '#8a1043', sky: ['#fff3b0', '#ffcc33', '#ff7a00'], circle: ['#5ee7ff', '#7b2ff7'], line: '#2b1440', tint: 18, deco: 'confetti', page: ['#5a0a3a', '#1a0412'] } },
  { id: 'board-navidad', category: 'board', name: 'Navidad colombiana', season: 'navidad', emoji: '🎄',
    board: { frame: '#b3123f', frameDark: '#4c0519', slab: '#7a0b2a', sky: ['#e0f2fe', '#7dc3f0', '#1e5fa8'], circle: ['#dbeafe', '#3b82f6'], line: '#1f2937', tint: 14, deco: 'snow', page: ['#4c0519', '#0b1a2e'] } },
  { id: 'board-esmeralda', category: 'board', name: 'Esmeralda (Pase)', passOnly: true, emoji: '💚',
    board: { frame: '#047857', frameDark: '#022c22', slab: '#064e3b', sky: ['#d1fae5', '#34d399', '#047857'], circle: ['#a7f3d0', '#059669'], line: '#022c22', tint: 16, deco: 'stars', page: ['#064e3b', '#011410'] } },
  { id: 'board-galaxia', category: 'board', name: 'Galaxia (Pase)', passOnly: true, emoji: '🌌',
    board: { frame: '#312e81', frameDark: '#0b0a2e', slab: '#1e1b4b', sky: ['#818cf8', '#4338ca', '#1e1b4b'], circle: ['#f0abfc', '#6d28d9'], line: '#0b0a2e', tint: 24, deco: 'stars', page: ['#1e1b4b', '#05041a'] } },

  // Dados
  { id: 'dice-clasico', category: 'dice', name: 'Clásicos', emoji: '🎲', dice: { face: ['#ffffff', '#efe3c8'], pip: '#2a1400', one: '#e8112d' } },
  { id: 'dice-oro', category: 'dice', name: 'De oro', coins: 8000, emoji: '🥇', dice: { face: ['#fff2a8', '#e0a400'], pip: '#5a3700', one: '#5a3700', edge: '#a87400' } },
  { id: 'dice-cafe', category: 'dice', name: 'Café tinto', emoji: '☕', dice: { face: ['#c89566', '#6b3f1c'], pip: '#fff4dc', one: '#ffd36b', edge: '#4a2a10' } },
  { id: 'dice-neon', category: 'dice', name: 'Neón', emoji: '💡', dice: { face: ['#2a1460', '#0a0520'], pip: '#3cf2ff', one: '#ff4fd8', edge: '#000' } },
  { id: 'dice-cristal', category: 'dice', name: 'Cristal', emoji: '🔮', dice: { face: ['#e0f7ff', '#8fd3ff'], pip: '#0b3d91', one: '#e11d48', edge: '#5aa9e6' } },
  { id: 'dice-rubi', category: 'dice', name: 'Rubí (Pase)', passOnly: true, emoji: '❤️', dice: { face: ['#ff8fa3', '#be123c'], pip: '#fff', one: '#ffe066', edge: '#7f0a26' } },
  { id: 'dice-navidad', category: 'dice', name: 'Bastón de caramelo', season: 'navidad', emoji: '🍬', dice: { face: ['#ffffff', '#ffe4e6'], pip: '#be123c', one: '#16a34a' } },
  { id: 'dice-carnaval', category: 'dice', name: 'Marimonda', season: 'carnaval', emoji: '🎭', dice: { face: ['#ffe066', '#ff7a00'], pip: '#4b1fa3', one: '#e11d48' } },
  { id: 'dice-feria', category: 'dice', name: 'Silleta', season: 'feria', emoji: '💐', dice: { face: ['#fff0f7', '#ffc2df'], pip: '#1f7a3a', one: '#e8559b' } },

  // Fichas
  { id: 'pieces-clasica', category: 'pieces', name: 'Clásicas', emoji: '⚪', pieces: 'clasica' },
  { id: 'pieces-moneda', category: 'pieces', name: 'Moneda de oro', coins: 10000, emoji: '🪙', pieces: 'moneda' },
  { id: 'pieces-gema', category: 'pieces', name: 'Esmeralda', emoji: '💎', pieces: 'gema' },
  { id: 'pieces-brillante', category: 'pieces', name: 'Brillantes', emoji: '✨', pieces: 'brillante' },
  { id: 'pieces-cristal', category: 'pieces', name: 'Cristal', emoji: '🔮', pieces: 'cristal' },
  { id: 'pieces-corona', category: 'pieces', name: 'Corona real (Pase)', passOnly: true, emoji: '👑', pieces: 'corona' },
  { id: 'pieces-estrella', category: 'pieces', name: 'Estrella de Belén', season: 'navidad', emoji: '⭐', pieces: 'estrella' },

  // Marcos de avatar
  { id: 'frame-ninguno', category: 'frame', name: 'Sencillo', emoji: '⭕', frame: { ring: ['#ffffff55', '#ffffff22'], ornament: null } },
  { id: 'frame-oro', category: 'frame', name: 'Dorado', coins: 5000, emoji: '🟡', frame: { ring: ['#ffe680', '#c98a00'], ornament: '⭐' } },
  { id: 'frame-vueltiao', category: 'frame', name: 'Vueltiao', emoji: '🤠', frame: { ring: ['#f4e3c1', '#2a1400'], ornament: '🤠' } },
  { id: 'frame-tricolor', category: 'frame', name: 'Tricolor', emoji: '🇨🇴', frame: { ring: ['#ffcd00', '#ce1126'], ornament: '🇨🇴' } },
  { id: 'frame-fuego', category: 'frame', name: 'Fuego', emoji: '🔥', frame: { ring: ['#ffb347', '#ff3b4e'], ornament: '🔥' } },
  { id: 'frame-diamante', category: 'frame', name: 'Diamante (Pase)', passOnly: true, emoji: '💠', frame: { ring: ['#a5f3fc', '#6366f1'], ornament: '💎' } },
  { id: 'frame-navidad', category: 'frame', name: 'Alumbrado', season: 'navidad', emoji: '🎄', frame: { ring: ['#22c55e', '#e11d48'], ornament: '🎄' } },

  // Efectos de captura
  { id: 'effect-estrellas', category: 'effect', name: 'Estrellas', emoji: '⭐', effect: 'stars' },
  { id: 'effect-flores', category: 'effect', name: 'Lluvia de flores', coins: 6000, emoji: '🌺', effect: 'flowers' },
  { id: 'effect-confeti', category: 'effect', name: 'Confeti', emoji: '🎊', effect: 'confetti' },
  { id: 'effect-pólvora', category: 'effect', name: 'Pólvora', emoji: '🎆', effect: 'fireworks' },
  { id: 'effect-nieve', category: 'effect', name: 'Nieve', season: 'navidad', emoji: '❄️', effect: 'snow' },
];

export const ITEMS: Item[] = RAW.map(({ coins, passOnly, ...it }) => {
  const usd = ITEM_PRICES_USD[it.id];
  const currency: Currency = passOnly ? 'pass' : coins ? 'coins' : usd ? 'usd' : 'free';
  return { ...it, currency, price: coins ?? 0 };
});

export function usdPrice(id: string): number | undefined {
  return ITEM_PRICES_USD[id];
}

export const DEFAULT_EQUIPPED: Record<Category, string> = {
  board: 'board-clasico',
  dice: 'dice-clasico',
  pieces: 'pieces-clasica',
  frame: 'frame-ninguno',
  effect: 'effect-estrellas',
};

export const FREE_ITEMS = ITEMS.filter((i) => i.currency === 'free').map((i) => i.id);

export function item(id: string): Item {
  return ITEMS.find((i) => i.id === id) ?? ITEMS.find((i) => i.id === DEFAULT_EQUIPPED[id.split('-')[0] as Category])!;
}

export const CATEGORY_NAMES: Record<Category, string> = {
  board: 'Tableros',
  dice: 'Dados',
  pieces: 'Fichas',
  frame: 'Marcos',
  effect: 'Efectos',
};

/** Emotes que se envían en partida pagando gemas. */
export interface Emote {
  id: string;
  glyph: string;
  gems: number;
  /** Solo con el pase. */
  pass?: boolean;
}

export const EMOTES: Emote[] = [
  { id: 'e-risa', glyph: '😂', gems: 1 },
  { id: 'e-susto', glyph: '😱', gems: 1 },
  { id: 'e-fuego', glyph: '🔥', gems: 1 },
  { id: 'e-chevere', glyph: '😎', gems: 1 },
  { id: 'e-aplauso', glyph: '👏', gems: 1 },
  { id: 'e-rabia', glyph: '😡', gems: 1 },
  { id: 'e-corazon', glyph: '❤️', gems: 2 },
  { id: 'e-corona', glyph: '👑', gems: 2 },
  { id: 'e-tinto', glyph: '☕', gems: 2 },
  { id: 'e-polvora', glyph: '🎆', gems: 3 },
  { id: 'e-trofeo', glyph: '🏆', gems: 3, pass: true },
  { id: 'e-cohete', glyph: '🚀', gems: 3, pass: true },
];

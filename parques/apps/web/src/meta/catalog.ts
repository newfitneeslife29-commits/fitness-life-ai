/** Catálogo de la tienda: skins de tablero, dados, fichas, marcos de avatar y efectos de captura. */
import type { Season } from './seasons';

export type Category = 'board' | 'dice' | 'pieces' | 'frame' | 'effect';
export type Currency = 'coins' | 'gems';

export interface BoardTheme {
  frame: string;
  frameDark: string;
  sky: [string, string, string];
  circle: [string, string];
  line: string;
  tint: number;
  deco: 'clouds' | 'flowers' | 'snow' | 'coffee' | 'confetti' | 'stars';
  /** Fondo de la pantalla de juego. */
  page: [string, string];
}

export interface DiceSkin {
  face: [string, string];
  pip: string;
  one: string;
}

export type PieceStyle = 'clasica' | 'gema' | 'brillante' | 'moneda' | 'estrella';
export type EffectStyle = 'stars' | 'flowers' | 'confetti' | 'fireworks' | 'snow';

export interface FrameSkin {
  ring: [string, string];
  ornament: string | null;
}

export interface Item {
  id: string;
  category: Category;
  name: string;
  price: number;
  currency: Currency;
  season?: Season['id'];
  board?: BoardTheme;
  dice?: DiceSkin;
  pieces?: PieceStyle;
  frame?: FrameSkin;
  effect?: EffectStyle;
  emoji: string;
}

export const ITEMS: Item[] = [
  // Tableros
  { id: 'board-clasico', category: 'board', name: 'Clásico', price: 0, currency: 'coins', emoji: '☁️',
    board: { frame: '#0d2f80', frameDark: '#071a4d', sky: ['#bfe6ff', '#5fb4f2', '#2f86e0'], circle: ['#8fd3ff', '#1e88e5'], line: '#13254f', tint: 16, deco: 'clouds', page: ['#2a1660', '#120c2e'] } },
  { id: 'board-cafetero', category: 'board', name: 'Eje Cafetero', price: 1500, currency: 'coins', emoji: '☕',
    board: { frame: '#5b3a1e', frameDark: '#2e1b0b', sky: ['#f6e7c8', '#c8a273', '#8a5a2b'], circle: ['#d9b48a', '#7a4a22'], line: '#3b2412', tint: 20, deco: 'coffee', page: ['#4a2c16', '#1e1008'] } },
  { id: 'board-caribe', category: 'board', name: 'Caribe', price: 2500, currency: 'coins', emoji: '🏝️',
    board: { frame: '#0e7c86', frameDark: '#064a50', sky: ['#c9fbff', '#42d6df', '#0aa6b5'], circle: ['#ffe7a3', '#ffb347'], line: '#0b3d44', tint: 14, deco: 'stars', page: ['#0b5560', '#06222a'] } },
  { id: 'board-noche', category: 'board', name: 'Noche de rumba', price: 60, currency: 'gems', emoji: '🌃',
    board: { frame: '#1b0f3d', frameDark: '#0a0520', sky: ['#5a2ea6', '#2a1460', '#140a33'], circle: ['#ff4fd8', '#4b1fa3'], line: '#0a0520', tint: 22, deco: 'stars', page: ['#2a0f55', '#08031a'] } },
  { id: 'board-feria', category: 'board', name: 'Feria de las Flores', price: 50, currency: 'gems', season: 'feria', emoji: '🌸',
    board: { frame: '#1f7a3a', frameDark: '#0f4720', sky: ['#ffe3f1', '#ff9fcf', '#e8559b'], circle: ['#fff1a8', '#ff8ac6'], line: '#2b1440', tint: 16, deco: 'flowers', page: ['#5a1a45', '#1d0818'] } },
  { id: 'board-carnaval', category: 'board', name: 'Carnaval', price: 50, currency: 'gems', season: 'carnaval', emoji: '🎭',
    board: { frame: '#c2185b', frameDark: '#6b0d33', sky: ['#fff3b0', '#ffcc33', '#ff7a00'], circle: ['#5ee7ff', '#7b2ff7'], line: '#2b1440', tint: 18, deco: 'confetti', page: ['#5a0a3a', '#1a0412'] } },
  { id: 'board-navidad', category: 'board', name: 'Navidad colombiana', price: 40, currency: 'gems', season: 'navidad', emoji: '🎄',
    board: { frame: '#9f1239', frameDark: '#4c0519', sky: ['#e0f2fe', '#7dc3f0', '#1e5fa8'], circle: ['#dbeafe', '#3b82f6'], line: '#1f2937', tint: 14, deco: 'snow', page: ['#4c0519', '#0b1a2e'] } },

  // Dados
  { id: 'dice-clasico', category: 'dice', name: 'Clásicos', price: 0, currency: 'coins', emoji: '🎲', dice: { face: ['#ffffff', '#f3e6cc'], pip: '#2a1400', one: '#e8112d' } },
  { id: 'dice-oro', category: 'dice', name: 'De oro', price: 1200, currency: 'coins', emoji: '🥇', dice: { face: ['#fff2a8', '#f2b800'], pip: '#5a3700', one: '#5a3700' } },
  { id: 'dice-cafe', category: 'dice', name: 'Café tinto', price: 900, currency: 'coins', emoji: '☕', dice: { face: ['#c89566', '#7a4a22'], pip: '#fff4dc', one: '#ffd36b' } },
  { id: 'dice-neon', category: 'dice', name: 'Neón', price: 30, currency: 'gems', emoji: '💡', dice: { face: ['#2a1460', '#0a0520'], pip: '#3cf2ff', one: '#ff4fd8' } },
  { id: 'dice-navidad', category: 'dice', name: 'Bastón de caramelo', price: 25, currency: 'gems', season: 'navidad', emoji: '🍬', dice: { face: ['#ffffff', '#ffe4e6'], pip: '#be123c', one: '#16a34a' } },
  { id: 'dice-carnaval', category: 'dice', name: 'Marimonda', price: 25, currency: 'gems', season: 'carnaval', emoji: '🎭', dice: { face: ['#ffe066', '#ff7a00'], pip: '#4b1fa3', one: '#e11d48' } },
  { id: 'dice-feria', category: 'dice', name: 'Silleta', price: 25, currency: 'gems', season: 'feria', emoji: '💐', dice: { face: ['#fff0f7', '#ffc2df'], pip: '#1f7a3a', one: '#e8559b' } },

  // Fichas
  { id: 'pieces-clasica', category: 'pieces', name: 'Clásicas', price: 0, currency: 'coins', emoji: '⚪', pieces: 'clasica' },
  { id: 'pieces-gema', category: 'pieces', name: 'Esmeralda', price: 1500, currency: 'coins', emoji: '💎', pieces: 'gema' },
  { id: 'pieces-moneda', category: 'pieces', name: 'Moneda de oro', price: 2000, currency: 'coins', emoji: '🪙', pieces: 'moneda' },
  { id: 'pieces-brillante', category: 'pieces', name: 'Brillantes', price: 35, currency: 'gems', emoji: '✨', pieces: 'brillante' },
  { id: 'pieces-estrella', category: 'pieces', name: 'Estrella de Belén', price: 30, currency: 'gems', season: 'navidad', emoji: '⭐', pieces: 'estrella' },

  // Marcos de avatar
  { id: 'frame-ninguno', category: 'frame', name: 'Sencillo', price: 0, currency: 'coins', emoji: '⭕', frame: { ring: ['#ffffff55', '#ffffff22'], ornament: null } },
  { id: 'frame-oro', category: 'frame', name: 'Dorado', price: 800, currency: 'coins', emoji: '🟡', frame: { ring: ['#ffe680', '#c98a00'], ornament: '⭐' } },
  { id: 'frame-vueltiao', category: 'frame', name: 'Vueltiao', price: 1400, currency: 'coins', emoji: '🤠', frame: { ring: ['#f4e3c1', '#2a1400'], ornament: '🤠' } },
  { id: 'frame-tricolor', category: 'frame', name: 'Tricolor', price: 20, currency: 'gems', emoji: '🇨🇴', frame: { ring: ['#ffcd00', '#ce1126'], ornament: '🇨🇴' } },
  { id: 'frame-fuego', category: 'frame', name: 'Fuego', price: 40, currency: 'gems', emoji: '🔥', frame: { ring: ['#ffb347', '#ff3b4e'], ornament: '🔥' } },
  { id: 'frame-navidad', category: 'frame', name: 'Alumbrado', price: 20, currency: 'gems', season: 'navidad', emoji: '🎄', frame: { ring: ['#22c55e', '#e11d48'], ornament: '🎄' } },

  // Efectos de captura
  { id: 'effect-estrellas', category: 'effect', name: 'Estrellas', price: 0, currency: 'coins', emoji: '⭐', effect: 'stars' },
  { id: 'effect-flores', category: 'effect', name: 'Lluvia de flores', price: 1000, currency: 'coins', emoji: '🌺', effect: 'flowers' },
  { id: 'effect-confeti', category: 'effect', name: 'Confeti', price: 1300, currency: 'coins', emoji: '🎊', effect: 'confetti' },
  { id: 'effect-pólvora', category: 'effect', name: 'Pólvora', price: 30, currency: 'gems', emoji: '🎆', effect: 'fireworks' },
  { id: 'effect-nieve', category: 'effect', name: 'Nieve', price: 20, currency: 'gems', season: 'navidad', emoji: '❄️', effect: 'snow' },
];

export const DEFAULT_EQUIPPED: Record<Category, string> = {
  board: 'board-clasico',
  dice: 'dice-clasico',
  pieces: 'pieces-clasica',
  frame: 'frame-ninguno',
  effect: 'effect-estrellas',
};

export const FREE_ITEMS = ITEMS.filter((i) => i.price === 0).map((i) => i.id);

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

/** Paquetes de monedas que se compran con gemas (no hay pagos con dinero real). */
export const COIN_PACKS = [
  { gems: 10, coins: 800 },
  { gems: 25, coins: 2200 },
  { gems: 60, coins: 6000 },
];

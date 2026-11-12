/**
 * Catálogo de la tienda: tableros, dados, fichas, marcos de avatar y efectos de captura.
 * La mayoría se compran con dinero real (precio en ITEM_PRICES_USD del motor), unos pocos con
 * monedas del juego y otros solo se consiguen en el Pase de batalla.
 */
import { ITEM_PRICES_USD } from '../economy';
import type { Season } from './seasons';

export type Category = 'board' | 'dice' | 'pieces' | 'frame' | 'effect';
export type Currency = 'coins' | 'usd' | 'pass' | 'free' | 'event';

/** Ilustraciones de tablero (dibujos de fondo, centro y esquinas). */
export type BoardArt =
  | 'playa' | 'cafetal' | 'cartagena' | 'selva' | 'llanos' | 'salsa' | 'silletas' | 'guatape'
  | 'tejo' | 'cielo' | 'carnaval' | 'navidad' | 'tatacoa';

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
  /** Dibujos del tablero (tableros ilustrados). */
  art?: BoardArt;
  /** Fondo de la pantalla de juego. */
  page: [string, string];
}

export interface DiceSkin {
  face: [string, string];
  pip: string;
  one: string;
  edge?: string;
}

export type PieceStyle = 'clasica' | 'gema' | 'brillante' | 'moneda' | 'estrella' | 'cristal' | 'corona' | 'perla' | 'mate' | 'obsidiana' | 'tricolor' | 'fuego' | 'viento';
export type EffectStyle = 'stars' | 'flowers' | 'confetti' | 'fireworks' | 'snow' | 'bubbles' | 'butterflies' | 'lightning' | 'music';

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
  /** Evento de 15 días que lo entrega (solo se gana ahí). */
  event?: string;
  board?: BoardTheme;
  dice?: DiceSkin;
  pieces?: PieceStyle;
  frame?: FrameSkin;
  effect?: EffectStyle;
  emoji: string;
}

type Raw = Omit<Item, 'currency' | 'price'> & { coins?: number; passOnly?: boolean };

const page = (a: string, b: string): [string, string] => [a, b];

const RAW: Raw[] = [
  // Tableros
  { id: 'board-clasico', category: 'board', name: 'Clásico', emoji: '☁️',
    board: { frame: '#1446b8', frameDark: '#071a4d', slab: '#0b2a75', sky: ['#c9ecff', '#5fb4f2', '#2f86e0'], circle: ['#9adaff', '#1e88e5'], line: '#13254f', tint: 16, deco: 'clouds', page: ['#2a1660', '#120c2e'] } },
  { id: 'board-cafetero', category: 'board', name: 'Eje Cafetero', coins: 15000, emoji: '☕',
    board: { frame: '#6b4423', frameDark: '#2e1b0b', slab: '#3d2512', sky: ['#f6e7c8', '#c8a273', '#8a5a2b'], circle: ['#d9b48a', '#7a4a22'], line: '#3b2412', tint: 20, deco: 'coffee', art: 'cafetal', page: ['#4a2c16', '#1e1008'] } },
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
    board: { frame: '#1f7a3a', frameDark: '#0f4720', slab: '#145a2b', sky: ['#ffe3f1', '#ff9fcf', '#e8559b'], circle: ['#fff1a8', '#ff8ac6'], line: '#2b1440', tint: 16, deco: 'flowers', art: 'silletas', page: ['#5a1a45', '#1d0818'] } },
  { id: 'board-carnaval', category: 'board', name: 'Carnaval', season: 'carnaval', emoji: '🎭',
    board: { frame: '#c2185b', frameDark: '#6b0d33', slab: '#8a1043', sky: ['#fff3b0', '#ffcc33', '#ff7a00'], circle: ['#5ee7ff', '#7b2ff7'], line: '#2b1440', tint: 18, deco: 'confetti', art: 'carnaval', page: ['#5a0a3a', '#1a0412'] } },
  { id: 'board-navidad', category: 'board', name: 'Navidad colombiana', season: 'navidad', emoji: '🎄',
    board: { frame: '#b3123f', frameDark: '#4c0519', slab: '#7a0b2a', sky: ['#e0f2fe', '#7dc3f0', '#1e5fa8'], circle: ['#dbeafe', '#3b82f6'], line: '#1f2937', tint: 14, deco: 'snow', art: 'navidad', page: ['#4c0519', '#0b1a2e'] } },
  { id: 'board-esmeralda', category: 'board', name: 'Esmeralda (Pase)', passOnly: true, emoji: '💚',
    board: { frame: '#047857', frameDark: '#022c22', slab: '#064e3b', sky: ['#d1fae5', '#34d399', '#047857'], circle: ['#a7f3d0', '#059669'], line: '#022c22', tint: 16, deco: 'stars', page: ['#064e3b', '#011410'] } },
  { id: 'board-galaxia', category: 'board', name: 'Galaxia (Pase)', passOnly: true, emoji: '🌌',
    board: { frame: '#312e81', frameDark: '#0b0a2e', slab: '#1e1b4b', sky: ['#818cf8', '#4338ca', '#1e1b4b'], circle: ['#f0abfc', '#6d28d9'], line: '#0b0a2e', tint: 24, deco: 'stars', page: ['#1e1b4b', '#05041a'] } },

  // Tableros ilustrados (v0.9)
  { id: 'board-playa', category: 'board', name: 'Playa caribeña', emoji: '🏖️',
    board: { frame: '#f2c14e', frameDark: '#8a5a00', slab: '#b07a10', sky: ['#bff6ff', '#4fd1e8', '#1597c7'], circle: ['#fff3c4', '#ffb347'], line: '#0b3d44', tint: 12, deco: 'stars', art: 'playa', page: page('#0a6b80', '#06222a') } },
  { id: 'board-cartagena', category: 'board', name: 'Cartagena amurallada', emoji: '🏰',
    board: { frame: '#d9822b', frameDark: '#7a3c0a', slab: '#a65412', sky: ['#ffe8c2', '#ffb36b', '#e8643c'], circle: ['#fff1d6', '#f59e0b'], line: '#3b1a05', tint: 14, deco: 'flowers', art: 'cartagena', page: page('#7a2e0c', '#220a02') } },
  { id: 'board-selva', category: 'board', name: 'Selva amazónica', emoji: '🦜',
    board: { frame: '#1f6b2e', frameDark: '#0a2e12', slab: '#134a1f', sky: ['#d8f5c9', '#6fcf6a', '#1f8a3a'], circle: ['#fff59d', '#2e7d32'], line: '#08260f', tint: 16, deco: 'flowers', art: 'selva', page: page('#0f3d1a', '#041207') } },
  { id: 'board-llanos', category: 'board', name: 'Atardecer llanero', coins: 30000, emoji: '🐎',
    board: { frame: '#a0522d', frameDark: '#4a200c', slab: '#6e3417', sky: ['#ffe29a', '#ff9a5a', '#d9435a'], circle: ['#ffd27a', '#c2410c'], line: '#3a1406', tint: 16, deco: 'stars', art: 'llanos', page: page('#5a1e22', '#1a0608') } },
  { id: 'board-salsa', category: 'board', name: 'Cali salsera', emoji: '💃',
    board: { frame: '#b0124b', frameDark: '#4a0520', slab: '#7a0c33', sky: ['#ffd6e7', '#ff5fa2', '#8a1a8f'], circle: ['#ffe066', '#e11d74'], line: '#2a0414', tint: 20, deco: 'stars', art: 'salsa', page: page('#4a0a3a', '#14020f') } },
  { id: 'board-silleta', category: 'board', name: 'Silletas de flores', coins: 45000, emoji: '💐',
    board: { frame: '#2f7d32', frameDark: '#123a14', slab: '#1d5a20', sky: ['#fff4f9', '#ffc1dc', '#f06292'], circle: ['#fffde7', '#ff80ab'], line: '#2b1440', tint: 14, deco: 'flowers', art: 'silletas', page: page('#5a1a45', '#1d0818') } },
  { id: 'board-guatape', category: 'board', name: 'Peñol de Guatapé', emoji: '🪨',
    board: { frame: '#1565c0', frameDark: '#0a2a5a', slab: '#0d4690', sky: ['#e3f6ff', '#7cc7f5', '#2e86de'], circle: ['#e8f5e9', '#43a047'], line: '#0a2a5a', tint: 14, deco: 'clouds', art: 'guatape', page: page('#0d3c75', '#04122a') } },
  { id: 'board-tatacoa', category: 'board', name: 'Desierto de la Tatacoa', coins: 20000, emoji: '🌵',
    board: { frame: '#c9822f', frameDark: '#6b3a0e', slab: '#94561a', sky: ['#fff1cf', '#f2c98a', '#d9944a'], circle: ['#ffe1a8', '#d9944a'], line: '#5a3010', tint: 10, cell: '#fff4dc', deco: 'wood', art: 'tatacoa', page: page('#4a2a52', '#1c0f22') } },
  { id: 'board-tejo', category: 'board', name: 'Cancha de tejo (Evento)', event: 'ev-partidas', emoji: '💣',
    board: { frame: '#5d4037', frameDark: '#1e110d', slab: '#3e2723', sky: ['#efe0c8', '#c9a77c', '#8d6e4a'], circle: ['#ffcc80', '#e53935'], line: '#1e110d', tint: 18, deco: 'wood', art: 'tejo', page: page('#3e2723', '#120806') } },
  { id: 'board-cielo', category: 'board', name: 'Cielo de coronas (Evento)', event: 'ev-coronas', emoji: '☁️',
    board: { frame: '#5c6bc0', frameDark: '#1a237e', slab: '#3949ab', sky: ['#ffffff', '#c5cae9', '#7986cb'], circle: ['#fff8e1', '#ffca28'], line: '#1a237e', tint: 12, deco: 'clouds', art: 'cielo', page: page('#283593', '#0a0f3a') } },

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

  { id: 'dice-madera', category: 'dice', name: 'Madera tallada', coins: 4000, emoji: '🪵', dice: { face: ['#e8c48c', '#9a6a33'], pip: '#3b230d', one: '#7a1d0d', edge: '#5c3a17' } },
  { id: 'dice-tricolor', category: 'dice', name: 'Tricolor', coins: 6000, emoji: '🇨🇴', dice: { face: ['#ffe14d', '#ffcd00'], pip: '#003893', one: '#ce1126', edge: '#b38f00' } },
  { id: 'dice-mar', category: 'dice', name: 'Mar Caribe', coins: 9000, emoji: '🌊', dice: { face: ['#a5f3fc', '#0891b2'], pip: '#ffffff', one: '#fde047', edge: '#0e7490' } },
  { id: 'dice-esmeralda', category: 'dice', name: 'Esmeralda de Muzo', coins: 12000, emoji: '💚', dice: { face: ['#86efac', '#047857'], pip: '#ecfdf5', one: '#fde047', edge: '#064e3b' } },
  { id: 'dice-galaxia', category: 'dice', name: 'Galaxia', emoji: '🌌', dice: { face: ['#6d28d9', '#1e1b4b'], pip: '#e0e7ff', one: '#f0abfc', edge: '#0b0a2e' } },
  { id: 'dice-lava', category: 'dice', name: 'Lava del Galeras', emoji: '🌋', dice: { face: ['#fb923c', '#7f1d1d'], pip: '#fff7ed', one: '#fde047', edge: '#450a0a' } },
  { id: 'dice-locos', category: 'dice', name: 'Pares locos (Evento)', event: 'ev-pares', emoji: '🎯', dice: { face: ['#fef08a', '#22d3ee'], pip: '#7c3aed', one: '#e11d48', edge: '#0e7490' } },

  // Fichas
  { id: 'pieces-clasica', category: 'pieces', name: 'Clásicas', emoji: '⚪', pieces: 'clasica' },
  { id: 'pieces-moneda', category: 'pieces', name: 'Moneda de oro', coins: 10000, emoji: '🪙', pieces: 'moneda' },
  { id: 'pieces-gema', category: 'pieces', name: 'Esmeralda', emoji: '💎', pieces: 'gema' },
  { id: 'pieces-brillante', category: 'pieces', name: 'Brillantes', emoji: '✨', pieces: 'brillante' },
  { id: 'pieces-cristal', category: 'pieces', name: 'Cristal', emoji: '🔮', pieces: 'cristal' },
  { id: 'pieces-corona', category: 'pieces', name: 'Corona real (Pase)', passOnly: true, emoji: '👑', pieces: 'corona' },
  { id: 'pieces-estrella', category: 'pieces', name: 'Estrella de Belén', season: 'navidad', emoji: '⭐', pieces: 'estrella' },

  { id: 'pieces-mate', category: 'pieces', name: 'Mate', coins: 3000, emoji: '🟤', pieces: 'mate' },
  { id: 'pieces-perla', category: 'pieces', name: 'Perla del Pacífico', coins: 8000, emoji: '🫧', pieces: 'perla' },
  { id: 'pieces-obsidiana', category: 'pieces', name: 'Obsidiana', coins: 20000, emoji: '🖤', pieces: 'obsidiana' },
  { id: 'pieces-tricolor', category: 'pieces', name: 'Tricolor', emoji: '🇨🇴', pieces: 'tricolor' },
  { id: 'pieces-fuego', category: 'pieces', name: 'Fuego (Evento)', event: 'ev-capturas', emoji: '🔥', pieces: 'fuego' },
  { id: 'pieces-viento', category: 'pieces', name: 'Viento (Evento)', event: 'ev-soplos', emoji: '🌬️', pieces: 'viento' },

  // Marcos de avatar
  { id: 'frame-ninguno', category: 'frame', name: 'Sencillo', emoji: '⭕', frame: { ring: ['#ffffff55', '#ffffff22'], ornament: null } },
  { id: 'frame-oro', category: 'frame', name: 'Dorado', coins: 5000, emoji: '🟡', frame: { ring: ['#ffe680', '#c98a00'], ornament: '⭐' } },
  { id: 'frame-vueltiao', category: 'frame', name: 'Vueltiao', emoji: '🤠', frame: { ring: ['#f4e3c1', '#2a1400'], ornament: '🤠' } },
  { id: 'frame-tricolor', category: 'frame', name: 'Tricolor', emoji: '🇨🇴', frame: { ring: ['#ffcd00', '#ce1126'], ornament: '🇨🇴' } },
  { id: 'frame-fuego', category: 'frame', name: 'Fuego', emoji: '🔥', frame: { ring: ['#ffb347', '#ff3b4e'], ornament: '🔥' } },
  { id: 'frame-diamante', category: 'frame', name: 'Diamante (Pase)', passOnly: true, emoji: '💠', frame: { ring: ['#a5f3fc', '#6366f1'], ornament: '💎' } },
  { id: 'frame-navidad', category: 'frame', name: 'Alumbrado', season: 'navidad', emoji: '🎄', frame: { ring: ['#22c55e', '#e11d48'], ornament: '🎄' } },

  { id: 'frame-plata', category: 'frame', name: 'Plateado', coins: 2500, emoji: '⚪', frame: { ring: ['#f1f5f9', '#94a3b8'], ornament: null } },
  { id: 'frame-cafe', category: 'frame', name: 'Grano de café', coins: 4000, emoji: '☕', frame: { ring: ['#c8a273', '#4a2c16'], ornament: '☕' } },
  { id: 'frame-mar', category: 'frame', name: 'Marinero', coins: 7000, emoji: '⚓', frame: { ring: ['#7dd3fc', '#1e3a8a'], ornament: '⚓' } },
  { id: 'frame-sombrero', category: 'frame', name: 'Sombrero aguadeño', coins: 12000, emoji: '👒', frame: { ring: ['#fef3c7', '#1c1917'], ornament: '👒' } },
  { id: 'frame-arcoiris', category: 'frame', name: 'Arcoíris de Caño Cristales', emoji: '🌈', frame: { ring: ['#f43f5e', '#22c55e'], ornament: '🌈' } },
  { id: 'frame-neon', category: 'frame', name: 'Neón', emoji: '💡', frame: { ring: ['#22d3ee', '#d946ef'], ornament: '⚡' } },
  { id: 'frame-rey', category: 'frame', name: 'Rey de la mesa (Evento)', event: 'ev-ganadores', emoji: '🤴', frame: { ring: ['#fde68a', '#7c3aed'], ornament: '👑' } },
  { id: 'frame-podio', category: 'frame', name: 'Podio (Evento)', event: 'ev-podio', emoji: '🥇', frame: { ring: ['#fef3c7', '#b45309'], ornament: '🥇' } },

  // Efectos de captura
  { id: 'effect-estrellas', category: 'effect', name: 'Estrellas', emoji: '⭐', effect: 'stars' },
  { id: 'effect-flores', category: 'effect', name: 'Lluvia de flores', coins: 6000, emoji: '🌺', effect: 'flowers' },
  { id: 'effect-confeti', category: 'effect', name: 'Confeti', emoji: '🎊', effect: 'confetti' },
  { id: 'effect-pólvora', category: 'effect', name: 'Pólvora', emoji: '🎆', effect: 'fireworks' },
  { id: 'effect-nieve', category: 'effect', name: 'Nieve', season: 'navidad', emoji: '❄️', effect: 'snow' },
  { id: 'effect-burbujas', category: 'effect', name: 'Burbujas', coins: 4000, emoji: '🫧', effect: 'bubbles' },
  { id: 'effect-mariposas', category: 'effect', name: 'Mariposas amarillas', coins: 9000, emoji: '🦋', effect: 'butterflies' },
  { id: 'effect-rayos', category: 'effect', name: 'Rayos', emoji: '⚡', effect: 'lightning' },
  { id: 'effect-cumbia', category: 'effect', name: 'Cumbia (Evento)', event: 'ev-online', emoji: '🎶', effect: 'music' },
];

export const ITEMS: Item[] = RAW.map(({ coins, passOnly, ...it }) => {
  const usd = ITEM_PRICES_USD[it.id];
  const currency: Currency = passOnly ? 'pass' : it.event ? 'event' : coins ? 'coins' : usd ? 'usd' : 'free';
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

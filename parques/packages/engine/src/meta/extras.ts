/**
 * v1.2: cofre por victorias, Pase VIP, duplicar premio con anuncio, salvar la racha, retos del día,
 * modo Historia por regiones y ligas por divisiones. Todo es lógica pura (la usa el servidor).
 */
import type { HouseRules } from '../types';
import type { TableId } from '../economy';

// ---------------------------------------------------------------- Cofre por victorias

/** Victorias para llenar el cofre (con VIP, menos). */
export function winsForChest(vip: boolean): number {
  return vip ? 2 : 3;
}

/** Premio del cofre de victorias: monedas y algunas gemas (determinista con `random`). */
export function winChestReward(random: number): { coins: number; gems: number } {
  const coins = 400 + Math.floor(random * 9) * 100; // 400..1200
  const gems = random > 0.7 ? 5 : random > 0.35 ? 3 : 2;
  return { coins, gems };
}

// ---------------------------------------------------------------- Pase VIP

export const VIP_DAYS = 30;
export const DAY_MS = 86_400_000;

export function isVip(vipUntil: number | undefined, now: number): boolean {
  return !!vipUntil && vipUntil > now;
}

/** Días de VIP que quedan (redondeado hacia arriba). */
export function vipDaysLeft(vipUntil: number | undefined, now: number): number {
  return isVip(vipUntil, now) ? Math.ceil((vipUntil! - now) / DAY_MS) : 0;
}

// ---------------------------------------------------------------- Salvar la racha

/** Gemas para no perder la racha diaria si faltaste UN día. */
export const STREAK_SAVE_GEMS = 15;

// ---------------------------------------------------------------- Retos del día

export interface ChallengeDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  players: 2 | 4;
  rules: Partial<HouseRules>;
  /** Premio por ganar el reto (una vez al día). */
  coins: number;
  gems: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'salida-libre', name: 'Salida libre', desc: 'Cualquier par saca todas las fichas', emoji: '🔓', players: 4, rules: { allOutDoubles: [1, 2, 3, 4, 5, 6] }, coins: 800, gems: 3 },
  { id: 'rapidito', name: 'Rapidito', desc: 'Solo 2 fichas por jugador', emoji: '⚡', players: 4, rules: { piecesPerPlayer: 2 }, coins: 600, gems: 2 },
  { id: 'sin-soplo', name: 'Sin soplo', desc: 'Nadie puede soplar', emoji: '🤐', players: 4, rules: { soplar: false }, coins: 600, gems: 2 },
  { id: 'un-intento', name: 'Un solo intento', desc: 'Un tiro para sacar par de la cárcel', emoji: '🎯', players: 4, rules: { jailAttempts: 1 }, coins: 900, gems: 3 },
  { id: 'mano-a-mano', name: 'Mano a mano', desc: '1 contra 1 frente a la máquina', emoji: '⚔️', players: 2, rules: {}, coins: 700, gems: 2 },
  { id: 'pares-locos', name: 'Pares locos', desc: 'Sin castigo por tres pares', emoji: '🎲', players: 4, rules: { triplePairPenalty: false }, coins: 600, gems: 2 },
  { id: 'cazador', name: 'Cacería', desc: 'Capturar NO da tirada extra', emoji: '🏹', players: 4, rules: { captureBonus: false }, coins: 800, gems: 3 },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Reto del día (cambia cada día, igual para todos). */
export function dailyChallenge(day: string): ChallengeDef {
  return CHALLENGES[hash(`reto:${day}`) % CHALLENGES.length]!;
}

// ---------------------------------------------------------------- Modo Historia por regiones

export interface StoryStage {
  id: string;
  region: string;
  emoji: string;
  /** Rival principal (nombre y avatar). */
  boss: string;
  bossAvatar: string;
  level: 'easy' | 'normal' | 'expert';
  players: 2 | 4;
  rules: Partial<HouseRules>;
  intro: string;
  /** Lo que se desbloquea al ganar. */
  reward: { coins: number; gems: number; itemIds: string[] };
}

export const STORY: StoryStage[] = [
  { id: 'costa', region: 'La Costa', emoji: '🌴', boss: 'La Palenquera', bossAvatar: 'av:avatar-palenquera', level: 'easy', players: 2, rules: {}, intro: '¡Ajá! ¿Y tú crees que me vas a ganar en mi tierra?', reward: { coins: 1000, gems: 5, itemIds: ['board-cartagena', 'avatar-palenquera'] } },
  { id: 'cafetal', region: 'Eje Cafetero', emoji: '☕', boss: 'El Cafetero', bossAvatar: 'av:avatar-cafetero', level: 'easy', players: 4, rules: {}, intro: 'Aquí se juega con calma, mijo… pero se gana.', reward: { coins: 1500, gems: 5, itemIds: ['avatar-cafetero', 'frame-cafetero'] } },
  { id: 'paisa', region: 'Antioquia', emoji: '💐', boss: 'El Silletero', bossAvatar: 'av:avatar-silletero', level: 'normal', players: 4, rules: {}, intro: '¡Ave María, pues! Vamos a ver de qué está hecho.', reward: { coins: 2000, gems: 8, itemIds: ['board-silleta', 'avatar-silletero'] } },
  { id: 'llanos', region: 'Los Llanos', emoji: '🐎', boss: 'El Llanero', bossAvatar: 'av:avatar-llanero', level: 'normal', players: 2, rules: { jailAttempts: 2 }, intro: '¡Upa, compae! En el llano no hay segunda oportunidad.', reward: { coins: 2500, gems: 8, itemIds: ['board-llanos', 'avatar-llanero', 'dice-cuero'] } },
  { id: 'valle', region: 'El Valle', emoji: '💃', boss: 'El Salsero', bossAvatar: 'av:avatar-salsero', level: 'normal', players: 4, rules: {}, intro: '¡Oís, mirá! Acá se juega a ritmo de salsa.', reward: { coins: 3000, gems: 10, itemIds: ['board-salsa', 'avatar-salsero'] } },
  { id: 'pacifico', region: 'El Pacífico', emoji: '🐋', boss: 'El Pescador', bossAvatar: 'av:avatar-pescador', level: 'expert', players: 4, rules: {}, intro: '¡Qué sabrosura, primo! Pero en el mar mando yo.', reward: { coins: 3500, gems: 10, itemIds: ['board-ballenas', 'avatar-pescador'] } },
  { id: 'guajira', region: 'La Guajira', emoji: '🦩', boss: 'La Tejedora', bossAvatar: 'av:avatar-wayuu', level: 'expert', players: 2, rules: {}, intro: 'Paciencia, como el tejido. Un hilo a la vez.', reward: { coins: 4000, gems: 12, itemIds: ['board-guajira', 'avatar-wayuu', 'dice-mochila'] } },
  { id: 'dorado', region: 'El Dorado', emoji: '🏆', boss: 'El Cacique', bossAvatar: '👑', level: 'expert', players: 4, rules: { jailAttempts: 2 }, intro: 'Solo los dignos llegan al oro de Guatavita.', reward: { coins: 8000, gems: 25, itemIds: ['board-guatavita', 'dice-oro3d', 'frame-muisca'] } },
];

// ---------------------------------------------------------------- Ligas por divisiones

export interface Division {
  id: string;
  name: string;
  emoji: string;
  /** Trofeos mínimos. */
  min: number;
  /** Premio semanal por estar en esta división (si jugaste esa semana). */
  coins: number;
  gems: number;
  color: string;
}

export const DIVISIONS: Division[] = [
  { id: 'bronce', name: 'Bronce', emoji: '🥉', min: 0, coins: 500, gems: 2, color: '#cd7f32' },
  { id: 'plata', name: 'Plata', emoji: '🥈', min: 1100, coins: 1500, gems: 5, color: '#c0c0c0' },
  { id: 'oro', name: 'Oro', emoji: '🥇', min: 1300, coins: 4000, gems: 10, color: '#ffc928' },
  { id: 'platino', name: 'Platino', emoji: '💠', min: 1550, coins: 9000, gems: 20, color: '#5eead4' },
  { id: 'diamante', name: 'Diamante', emoji: '💎', min: 1850, coins: 20000, gems: 40, color: '#60a5fa' },
  { id: 'leyenda', name: 'Leyenda', emoji: '👑', min: 2200, coins: 50000, gems: 80, color: '#f472b6' },
];

export function divisionOf(rating: number): Division {
  let d = DIVISIONS[0]!;
  for (const x of DIVISIONS) if (rating >= x.min) d = x;
  return d;
}

/** Siguiente división y cuántos trofeos faltan (null si ya está en la última). */
export function nextDivision(rating: number): { div: Division; missing: number } | null {
  const i = DIVISIONS.indexOf(divisionOf(rating));
  const n = DIVISIONS[i + 1];
  return n ? { div: n, missing: n.min - rating } : null;
}

/** Tipo de mesa de los retos y la Historia (sin apuesta extra: entrada de Barrio). */
export const CHALLENGE_TABLE: TableId = 'barrio';

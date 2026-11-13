/**
 * v1.2 social: filtro del chat, bloqueos, sanción por abandono, referidos, clubes ("parches"),
 * mensajes rápidos y torneo relámpago. Datos y funciones puras (cliente y servidor).
 */

// ------------------------------------------------------------ Filtro del chat
const BAD = [
  'hijueputa', 'hijuepucha', 'hp', 'gonorrea', 'malparido', 'malparida', 'marica', 'maricon', 'maricón', 'puta', 'puto',
  'mierda', 'carechimba', 'chimba de', 'pirobo', 'piroba', 'culo', 'verga', 'mamaguevo', 'mamagüevo', 'cabron', 'cabrón',
  'pendejo', 'pendeja', 'idiota', 'imbecil', 'imbécil', 'estupido', 'estúpido', 'fuck', 'shit', 'bitch', 'asshole',
  'caremonda', 'zorra', 'perra', 'sapo hp', 'nojoda hp',
];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const BAD_RE = new RegExp(`(^|[^a-z0-9ñ])(${[...new Set(BAD.map(norm))].sort((a, b) => b.length - a.length).map((w) => w.replace(/ /g, '\\s+')).join('|')})(?=$|[^a-z0-9ñ])`, 'gi');

/** Cambia las groserías por asteriscos (mantiene el resto del mensaje). */
export function cleanChat(text: string, max = 120): string {
  const t = String(text ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, max);
  const n = norm(t);
  let out = '';
  let last = 0;
  BAD_RE.lastIndex = 0;
  for (let m = BAD_RE.exec(n); m; m = BAD_RE.exec(n)) {
    const start = m.index + m[1]!.length;
    const end = m.index + m[0].length;
    out += t.slice(last, start) + '*'.repeat(end - start);
    last = end;
  }
  return out + t.slice(last);
}

/** ¿El mensaje tenía groserías? */
export const isDirty = (text: string) => cleanChat(text) !== String(text ?? '').slice(0, 120);

// ------------------------------------------------------------ Mensajes rápidos a amigos
export const QUICK_MESSAGES = [
  '¿Jugamos una?',
  '¡Te reto a una partida!',
  '¡Buena partida!',
  'Ya voy, dame un momento',
  '¡Revancha!',
  '¿Armamos pareja para 2 vs 2?',
  'Entra al club',
  'Hoy no puedo, mañana sí',
];

// ------------------------------------------------------------ Abandonos
/** Abandonos de partidas online en 24 h antes de la sanción. */
export const ABANDON_LIMIT = 3;
export const ABANDON_WINDOW_MS = 24 * 3600_000;
/** Sanción: sin partidas online durante este tiempo (crece con cada sanción del día). */
export const ABANDON_PENALTY_MS = 10 * 60_000;

/** Registra un abandono; devuelve los nuevos datos y si quedó sancionado. */
export function abandonPenalty(abandons: number[], now: number): { abandons: number[]; penaltyUntil: number } {
  const recent = [...abandons.filter((t) => now - t < ABANDON_WINDOW_MS), now].slice(-20);
  const over = recent.length - ABANDON_LIMIT + 1;
  return { abandons: recent, penaltyUntil: over > 0 ? now + ABANDON_PENALTY_MS * over : 0 };
}

// ------------------------------------------------------------ Referidos
export const REFERRAL = {
  /** Para quien llega con el enlace. */
  newCoins: 500,
  /** Para quien invitó. */
  coins: 1000,
  gems: 10,
  /** Máximo de amigos invitados con premio. */
  max: 30,
  /** La cuenta nueva puede canjear el código solo durante su primer día. */
  windowMs: 48 * 3600_000,
};

/** Enlace para invitar (abre la web; en el celular ofrece la app). */
export function inviteUrl(base: string, id: string): string {
  return `${base.replace(/\/$/, '')}/r/${encodeURIComponent(id)}`;
}

// ------------------------------------------------------------ Clubes
export const CLUB_COST = 5000;
export const CLUB_MAX = 30;
export const CLUB_EMOJIS = ['🦜', '🐆', '☕', '🌽', '🎺', '🌺', '⚽', '🏆', '🐊', '🦅', '🔥', '💎', '🎲', '👑', '🌴', '🐂'];
/** Cofre del club: victorias online del club en la semana. Cada miembro cobra su parte una vez. */
export const CLUB_CHEST = [
  { wins: 10, coins: 500, gems: 2 },
  { wins: 30, coins: 1500, gems: 5 },
  { wins: 75, coins: 4000, gems: 12 },
];

export interface ClubRow {
  id: string;
  name: string;
  emoji: string;
  members: number;
  weekWins: number;
}
export interface ClubMember {
  id: string;
  name: string;
  avatar: string;
  level: number;
  rating: number;
  weekWins: number;
  role: 'owner' | 'member';
  online: boolean;
}
export interface ClubMessage {
  from: string;
  name: string;
  text: string;
  at: number;
}
export interface ClubInfo extends ClubRow {
  owner: string;
  rows: ClubMember[];
  messages: ClubMessage[];
  /** Niveles del cofre que ya cobré esta semana. */
  claimed: number[];
}

export function validClubName(name: string): string | null {
  const n = String(name ?? '').trim();
  if (n.length < 3) return 'El nombre es muy corto';
  if (n.length > 20) return 'El nombre es muy largo';
  if (isDirty(n)) return 'Ese nombre no está permitido';
  return null;
}

// ------------------------------------------------------------ Mensajes directos
export interface DirectMessage {
  from: string;
  to: string;
  text: string;
  at: number;
}

// ------------------------------------------------------------ Torneo relámpago (16 jugadores)
/** 4 mesas de 4; los ganadores juegan la final. La entrada es la de la mesa Ciudad. */
export const FLASH = {
  size: 16,
  /** Espera máxima antes de completar con la máquina. */
  waitMs: 30_000,
  entry: 1000,
  /** Premios de la final por puesto. */
  prizes: [
    { coins: 6000, gems: 15 },
    { coins: 2500, gems: 5 },
    { coins: 1000, gems: 2 },
    { coins: 500, gems: 0 },
  ],
};

export interface FlashBracket {
  id: string;
  stage: 'semis' | 'final' | 'done';
  /** 4 mesas: nombres sentados y ganador (cuando termine). */
  semis: { names: string[]; winner: string | null }[];
  final: { names: string[]; ranking: string[] } | null;
  /** Mi situación. */
  me: 'playing' | 'waiting' | 'out' | 'final' | 'champion' | 'done';
}

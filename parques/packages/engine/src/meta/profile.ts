/**
 * Perfil del jugador como DATOS + operaciones puras.
 * El servidor es quien las ejecuta (autoridad sobre monedas, gemas, compras y progreso);
 * el cliente solo muestra el perfil que le manda el servidor.
 */
import { levelFromXp, levelReward, productFor, table, type TableId } from '../economy';
import { weekKey } from '../net';
import { EMPTY_STATS, newlyUnlocked, type AchievementDef, type ProfileStats } from './achievements';
import { DEFAULT_EQUIPPED, FREE_ITEMS, EMOTES, item, type Category } from './catalog';
import { advanceMissions, DAILY_POOL, missionDef, pickMissions, WEEKLY_POOL, type MissionDef, type MissionState } from './missions';
import { freeReward, PASS_XP_PER_TIER, passSeasonId, premiumReward, tierFromXp, type PassReward } from './battlepass';
import { DAILY_REWARDS, ROULETTE, START_COINS, dailyStatus, dayKey, daysBetween, matchRewards, spinRoulette, type MatchSummary } from './rewards';
import { activeSeason } from './seasons';

export interface PassState {
  season: string;
  xp: number;
  premium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  photo: string | null;
  country: string;
  xp: number;
  coins: number;
  gems: number;
  stats: ProfileStats;
  achievements: Record<string, number>;
  owned: string[];
  equipped: Record<Category, string>;
  daily: { lastClaim: string | null; streak: number; lastSpin: string | null };
  missions: { day: string; daily: MissionState[]; week: string; weekly: MissionState[] };
  friends: Friend[];
  lastTournamentClaim: string | null;
  pass: PassState;
  passTiersTotal: number;
  /** Compras con dinero real ya entregadas. */
  grants: string[];
}

export interface MatchOutcome {
  coins: number;
  entry: number;
  xp: number;
  gems: number;
  levelBefore: number;
  levelAfter: number;
  levelCoins: number;
  passTiersGained: number;
  achievements: AchievementDef[];
  missions: MissionDef[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type OpResult<T = {}> = { ok: true; profile: Profile } & T;
export type OpFail = { ok: false; error: string };

const fail = (error: string): OpFail => ({ ok: false, error });

export function freshPass(now: Date): PassState {
  return { season: passSeasonId(now), xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
}

export const DEFAULT_AVATAR = '🦜';

export function newProfile(id: string, now = new Date()): Profile {
  const today = dayKey(now);
  const week = weekKey(now);
  return {
    id,
    name: 'Jugador',
    avatar: DEFAULT_AVATAR,
    photo: null,
    country: 'CO',
    xp: 0,
    coins: START_COINS,
    gems: 10,
    stats: { ...EMPTY_STATS, tableWins: {} },
    achievements: {},
    owned: [...FREE_ITEMS],
    equipped: { ...DEFAULT_EQUIPPED },
    daily: { lastClaim: null, streak: 0, lastSpin: null },
    missions: { day: today, daily: pickMissions(DAILY_POOL, today, 3), week, weekly: pickMissions(WEEKLY_POOL, week, 3) },
    friends: [],
    lastTournamentClaim: null,
    pass: freshPass(now),
    passTiersTotal: 0,
    grants: [],
  };
}

/** Completa campos que falten (perfiles guardados con versiones anteriores). */
export function normalizeProfile(p: Partial<Profile> & { id: string }, now = new Date()): Profile {
  const base = newProfile(p.id, now);
  const owned = [...new Set([...FREE_ITEMS, ...(p.owned ?? []).filter((id) => item(id).id === id)])];
  return {
    ...base,
    ...p,
    stats: { ...EMPTY_STATS, ...(p.stats ?? {}), tableWins: { ...(p.stats?.tableWins ?? {}) } },
    owned,
    equipped: { ...DEFAULT_EQUIPPED, ...(p.equipped ?? {}) },
    pass: { ...base.pass, ...(p.pass ?? {}) },
    missions: p.missions ?? base.missions,
    daily: { ...base.daily, ...(p.daily ?? {}) },
    grants: p.grants ?? [],
  };
}

function unlock(p: Profile): { profile: Profile; fresh: AchievementDef[] } {
  const fresh = newlyUnlocked({ stats: p.stats, level: levelFromXp(p.xp).level, owned: p.owned.length, passTiers: p.passTiersTotal }, p.achievements);
  if (!fresh.length) return { profile: p, fresh };
  const now = Date.now();
  return {
    profile: {
      ...p,
      achievements: { ...p.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) },
      coins: p.coins + fresh.reduce((t, a) => t + a.coins, 0),
    },
    fresh,
  };
}

/** Renueva misiones del día/semana y el pase del mes si cambiaron. */
export function refresh(p: Profile, now = new Date()): Profile {
  const today = dayKey(now);
  const week = weekKey(now);
  let out = p;
  if (p.missions.day !== today || p.missions.week !== week) {
    out = {
      ...out,
      missions: {
        day: today,
        daily: p.missions.day === today ? p.missions.daily : pickMissions(DAILY_POOL, today, 3),
        week,
        weekly: p.missions.week === week ? p.missions.weekly : pickMissions(WEEKLY_POOL, week, 3),
      },
    };
  }
  if (out.pass.season !== passSeasonId(now)) out = { ...out, pass: freshPass(now) };
  return out;
}

/** Cobra la entrada de una mesa. */
export function payEntry(p: Profile, entry: number): OpResult | OpFail {
  if (entry < 0) return fail('Entrada inválida');
  if (p.coins < entry) return fail('Te faltan monedas');
  return { ok: true, profile: { ...p, coins: p.coins - entry } };
}

/** Aplica el resultado de una partida (premios, XP, gemas, estadísticas, misiones, pase, logros). */
export function applyMatch(p0: Profile, m: MatchSummary, now = new Date()): OpResult<{ outcome: MatchOutcome }> {
  const p = refresh(p0, now);
  const { coins, xp, gems } = matchRewards(m);
  const before = levelFromXp(p.xp).level;
  const after = levelFromXp(p.xp + xp).level;
  let levelCoins = 0;
  for (let l = before + 1; l <= after; l++) levelCoins += levelReward(l).coins;
  const won = m.won;
  const st = p.stats;
  const winStreak = won ? st.winStreak + 1 : 0;
  const tableWins = { ...st.tableWins };
  if (won && m.table) tableWins[m.table] = (tableWins[m.table] ?? 0) + 1;
  const stats: ProfileStats = {
    ...st,
    games: st.games + 1,
    wins: st.wins + (won ? 1 : 0),
    podiums: st.podiums + (m.place >= 0 && m.place <= 2 ? 1 : 0),
    captures: st.captures + m.captures,
    captured: st.captured + m.captured,
    crowned: st.crowned + m.crowned,
    soplos: st.soplos + m.soplos,
    pairs: st.pairs + m.pairs,
    triplePenalties: st.triplePenalties + m.triplePenalties,
    onlineGames: st.onlineGames + (m.mode === 'online' ? 1 : 0),
    winStreak,
    bestWinStreak: Math.max(st.bestWinStreak, winStreak),
    teamWins: st.teamWins + (won && m.teams ? 1 : 0),
    quickWins: st.quickWins + (won && m.mode === 'quick' ? 1 : 0),
    sixWins: st.sixWins + (won && m.players === 6 ? 1 : 0),
    coinsWon: st.coinsWon + Math.max(0, coins - m.entry),
    gemsWon: st.gemsWon + gems,
    tableWins,
  };
  const d = advanceMissions(p.missions.daily, m);
  const w = advanceMissions(p.missions.weekly, m);
  const tierBefore = tierFromXp(p.pass.xp);
  const passXp = p.pass.xp + xp;
  const passTiersGained = tierFromXp(passXp) - tierBefore;
  const next: Profile = {
    ...p,
    xp: p.xp + xp,
    coins: p.coins + coins + levelCoins,
    gems: p.gems + gems,
    stats,
    missions: { ...p.missions, daily: d.list, weekly: w.list },
    pass: { ...p.pass, xp: passXp },
    passTiersTotal: p.passTiersTotal + passTiersGained,
  };
  const u = unlock(next);
  return {
    ok: true,
    profile: u.profile,
    outcome: { coins, entry: m.entry, xp, gems, levelBefore: before, levelAfter: after, levelCoins, passTiersGained, achievements: u.fresh, missions: [...d.completed, ...w.completed] },
  };
}

export function buyWithCoins(p: Profile, itemId: string, now = new Date()): OpResult | OpFail {
  const it = item(itemId);
  if (it.id !== itemId) return fail('Objeto desconocido');
  if (p.owned.includes(itemId)) return fail('Ya lo tienes');
  if (it.currency !== 'coins') return fail('Este objeto no se compra con monedas');
  if (it.season && activeSeason(now)?.id !== it.season) return fail('Solo disponible en su temporada');
  if (p.coins < it.price) return fail('Te faltan monedas');
  const u = unlock({ ...p, owned: [...p.owned, itemId], coins: p.coins - it.price, equipped: { ...p.equipped, [it.category]: itemId } });
  return { ok: true, profile: u.profile };
}

export function equip(p: Profile, itemId: string): OpResult | OpFail {
  if (!p.owned.includes(itemId)) return fail('No tienes ese objeto');
  return { ok: true, profile: { ...p, equipped: { ...p.equipped, [item(itemId).category]: itemId } } };
}

/** Emote pagado con gemas. */
export function spendEmote(p: Profile, emoteId: string): OpResult<{ glyph: string }> | OpFail {
  const e = EMOTES.find((x) => x.id === emoteId);
  if (!e) return fail('Emote desconocido');
  if (e.pass && !p.pass.premium) return fail('Ese emote es del Pase Premium');
  if (p.gems < e.gems) return fail('Te faltan gemas');
  const u = unlock({ ...p, gems: p.gems - e.gems, stats: { ...p.stats, emotesSent: p.stats.emotesSent + 1 } });
  return { ok: true, profile: u.profile, glyph: e.glyph };
}

/** Entrega una compra con dinero real ya verificada (idempotente por grantId). */
export function grantProduct(p0: Profile, productId: string, grantId: string, now = new Date()): OpResult<{ label: string }> | OpFail {
  if (p0.grants.includes(grantId)) return fail('Compra ya entregada');
  const pr = productFor(productId);
  if (!pr) return fail('Producto desconocido');
  let p: Profile = { ...refresh(p0, now), grants: [...p0.grants, grantId] };
  if (pr.kind === 'coins') p = { ...p, coins: p.coins + (pr.coins ?? 0) };
  if (pr.kind === 'gems') p = { ...p, gems: p.gems + (pr.gems ?? 0) };
  if (pr.kind === 'item' && pr.itemId) {
    const it = item(pr.itemId);
    p = { ...p, owned: p.owned.includes(it.id) ? p.owned : [...p.owned, it.id], equipped: { ...p.equipped, [it.category]: it.id } };
  }
  if (pr.kind === 'pass') {
    const extra = (pr.passTiers ?? 0) * PASS_XP_PER_TIER;
    p = { ...p, pass: { ...p.pass, premium: true, xp: p.pass.xp + extra }, passTiersTotal: p.passTiersTotal + (pr.passTiers ?? 0) };
  }
  return { ok: true, profile: unlock(p).profile, label: pr.kind === 'item' && pr.itemId ? item(pr.itemId).name : pr.name };
}

export function claimDaily(p: Profile, now = new Date()): OpResult<{ coins: number; day: number }> | OpFail {
  const today = dayKey(now);
  const st = dailyStatus(p.daily.lastClaim, p.daily.streak, today);
  if (!st.canClaim) return fail('Ya reclamaste hoy');
  const reward = DAILY_REWARDS[st.day - 1]!;
  const gap = p.daily.lastClaim ? daysBetween(p.daily.lastClaim, today) : 99;
  const streak = gap === 1 ? p.daily.streak + 1 : 1;
  const u = unlock({
    ...p,
    daily: { ...p.daily, lastClaim: today, streak },
    coins: p.coins + reward.coins,
    stats: { ...p.stats, maxDailyStreak: Math.max(p.stats.maxDailyStreak, streak) },
  });
  return { ok: true, profile: u.profile, coins: reward.coins, day: st.day };
}

export function spin(p: Profile, now = new Date(), random = Math.random()): OpResult<{ index: number; coins: number }> | OpFail {
  const today = dayKey(now);
  if (p.daily.lastSpin === today) return fail('Mañana tienes otro giro');
  const index = spinRoulette(random);
  const coins = ROULETTE[index]!.coins;
  return { ok: true, profile: { ...p, coins: p.coins + coins, daily: { ...p.daily, lastSpin: today } }, index, coins };
}

export function claimMission(p: Profile, id: string): OpResult<{ coins: number }> | OpFail {
  const def = missionDef(id);
  const st = [...p.missions.daily, ...p.missions.weekly].find((m) => m.id === id);
  if (!def || !st) return fail('Misión desconocida');
  if (st.claimed) return fail('Ya la reclamaste');
  if (st.progress < def.goal) return fail('Todavía no la completas');
  const upd = (list: MissionState[]) => list.map((m) => (m.id === id ? { ...m, claimed: true } : m));
  return { ok: true, profile: { ...p, missions: { ...p.missions, daily: upd(p.missions.daily), weekly: upd(p.missions.weekly) }, coins: p.coins + def.coins }, coins: def.coins };
}

export function claimPass(p0: Profile, tier: number, track: 'free' | 'premium', now = new Date()): OpResult<{ reward: PassReward }> | OpFail {
  const p = refresh(p0, now);
  if (tier < 1 || tier > tierFromXp(p.pass.xp)) return fail('Todavía no llegas a ese nivel');
  if (track === 'premium' && !p.pass.premium) return fail('Necesitas el Pase Premium');
  const list = track === 'free' ? p.pass.claimedFree : p.pass.claimedPremium;
  if (list.includes(tier)) return fail('Ya lo reclamaste');
  const r = track === 'free' ? freeReward(tier) : premiumReward(tier);
  let next: Profile = { ...p, pass: { ...p.pass, [track === 'free' ? 'claimedFree' : 'claimedPremium']: [...list, tier] }, coins: p.coins + (r.coins ?? 0), gems: p.gems + (r.gems ?? 0) };
  if (r.itemId && !next.owned.includes(r.itemId)) next = { ...next, owned: [...next.owned, r.itemId] };
  return { ok: true, profile: unlock(next).profile, reward: r };
}

const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function setIdentity(p: Profile, patch: { name?: string; avatar?: string; photo?: string | null; country?: string }): OpResult | OpFail {
  const out = { ...p };
  if (patch.name !== undefined) out.name = String(patch.name).trim().slice(0, 14) || 'Jugador';
  if (patch.avatar !== undefined) out.avatar = String(patch.avatar).slice(0, 8) || DEFAULT_AVATAR;
  if (patch.photo !== undefined) {
    if (patch.photo !== null && (!PHOTO_RE.test(patch.photo) || patch.photo.length > 40000)) return fail('Foto inválida o muy grande');
    out.photo = patch.photo;
  }
  if (patch.country !== undefined) out.country = String(patch.country).toUpperCase().slice(0, 2);
  return { ok: true, profile: out };
}

export function addFriend(p: Profile, f: Friend): OpResult | OpFail {
  if (f.id === p.id) return fail('Ese es tu propio código');
  if (p.friends.some((x) => x.id === f.id)) return fail('Ya es tu amigo');
  if (p.friends.length >= 200) return fail('Tienes demasiados amigos');
  return { ok: true, profile: { ...p, friends: [...p.friends, { id: String(f.id).slice(0, 16), name: String(f.name).slice(0, 14), avatar: String(f.avatar).slice(0, 8) }] } };
}

export function removeFriend(p: Profile, id: string): OpResult {
  return { ok: true, profile: { ...p, friends: p.friends.filter((f) => f.id !== id) } };
}

/** Resumen de una partida para un jugador (lo usa el servidor al terminar). */
export function summaryFor(params: {
  place: number;
  players: number;
  won: boolean;
  teams: boolean;
  stats: { captures: number; captured: number; crowned: number; soplosHechos: number; pairs: number; tripleParCastigos: number };
  mode: MatchSummary['mode'];
  table: TableId | null;
  entry: number;
}): MatchSummary {
  return {
    place: params.place,
    players: params.players,
    won: params.won,
    teams: params.teams,
    captures: params.stats.captures,
    captured: params.stats.captured,
    crowned: params.stats.crowned,
    soplos: params.stats.soplosHechos,
    pairs: params.stats.pairs,
    triplePenalties: params.stats.tripleParCastigos,
    mode: params.mode,
    table: params.table,
    entry: params.entry || (params.table ? (table(params.table)?.entry ?? 0) : 0),
  };
}

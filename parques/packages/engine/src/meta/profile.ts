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
import { AD_COINS, adStatus, EMPTY_ADS, type AdsState } from './ads';
import { eventAt, eventPoints, type EventState } from './events';
import { CHESTS, chestRoll, dailyDeals, GEM_EXCHANGE } from './shop';
import { DAILY_COUNT, WEEKLY_COUNT } from './missions';
import { DAY_MS, STORY, STREAK_SAVE_GEMS, VIP_DAYS, dailyChallenge, isVip, winChestReward, winsForChest } from './extras';
import { abandonPenalty, REFERRAL } from './social';

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
  /** Anuncios con premio vistos hoy. */
  ads: AdsState;
  /** Progreso en el evento de 15 días. */
  event: EventState;
  /** Paquetes comprados (para no volver a ofrecer los de una sola vez). */
  bundles: string[];
  /** Ofertas del día ya compradas. */
  deals: { day: string; bought: string[] };
  /** Cuentas de Apple / Google vinculadas (solo para mostrar). */
  linked: string[];
  /** Cofre por victorias: victorias acumuladas y cofres listos para abrir. */
  winChest: { wins: number; ready: number };
  /** Pase VIP activo hasta (ms). 0 = sin VIP. */
  vipUntil: number;
  /** Última partida con ganancia (para duplicarla viendo un anuncio, una vez). */
  lastWin: { id: string; net: number; doubled: boolean } | null;
  /** Reto del día ya ganado. */
  challenge: { day: string; done: boolean };
  /** Etapas del modo Historia superadas. */
  story: number;
  /** Jugadores bloqueados (no ves su chat ni te pueden escribir o invitar). */
  blocked: string[];
  /** Abandonos de partidas online (ms) y sanción activa hasta (ms). */
  abandons: number[];
  penaltyUntil: number;
  /** Quién me invitó (código de referido canjeado) y cuántos amigos he invitado. */
  referredBy: string | null;
  referrals: number;
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
  eventPoints: number;
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
    missions: { day: today, daily: pickMissions(DAILY_POOL, today, DAILY_COUNT), week, weekly: pickMissions(WEEKLY_POOL, week, WEEKLY_COUNT) },
    friends: [],
    lastTournamentClaim: null,
    pass: freshPass(now),
    passTiersTotal: 0,
    grants: [],
    ads: { ...EMPTY_ADS },
    event: { period: eventAt(now.getTime()).period, points: 0, claimed: [] },
    bundles: [],
    deals: { day: today, bought: [] },
    linked: [],
    winChest: { wins: 0, ready: 0 },
    vipUntil: 0,
    lastWin: null,
    challenge: { day: today, done: false },
    story: 0,
    blocked: [],
    abandons: [],
    penaltyUntil: 0,
    referredBy: null,
    referrals: 0,
  };
}

/** Completa campos que falten (perfiles guardados con versiones anteriores). */
export function normalizeProfile(p: Partial<Profile> & { id: string }, now = new Date()): Profile {
  const base = newProfile(p.id, now);
  const owned = [...new Set([...FREE_ITEMS, ...(p.owned ?? []).filter((id) => item(id).id === id)])];
  return {
    ...base,
    ...p,
    stats: { ...EMPTY_STATS, ...(p.stats ?? {}), tableWins: { ...(p.stats?.tableWins ?? {}) }, tableGames: { ...(p.stats?.tableGames ?? {}) } },
    owned,
    equipped: { ...DEFAULT_EQUIPPED, ...(p.equipped ?? {}) },
    pass: { ...base.pass, ...(p.pass ?? {}) },
    missions: p.missions ?? base.missions,
    daily: { ...base.daily, ...(p.daily ?? {}) },
    grants: p.grants ?? [],
    ads: { ...EMPTY_ADS, ...(p.ads ?? {}) },
    event: p.event ?? base.event,
    bundles: p.bundles ?? [],
    deals: p.deals ?? base.deals,
    linked: p.linked ?? [],
    winChest: { ...base.winChest, ...(p.winChest ?? {}) },
    vipUntil: p.vipUntil ?? 0,
    lastWin: p.lastWin ?? null,
    challenge: p.challenge ?? base.challenge,
    story: p.story ?? 0,
    blocked: p.blocked ?? [],
    abandons: p.abandons ?? [],
    penaltyUntil: p.penaltyUntil ?? 0,
    referredBy: p.referredBy ?? null,
    referrals: p.referrals ?? 0,
  };
}

function unlock(p: Profile): { profile: Profile; fresh: AchievementDef[] } {
  const fresh = newlyUnlocked({ stats: p.stats, level: levelFromXp(p.xp).level, owned: p.owned.length, passTiers: p.passTiersTotal, friends: p.friends.length }, p.achievements);
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
        daily: p.missions.day === today ? p.missions.daily : pickMissions(DAILY_POOL, today, DAILY_COUNT),
        week,
        weekly: p.missions.week === week ? p.missions.weekly : pickMissions(WEEKLY_POOL, week, WEEKLY_COUNT),
      },
    };
  }
  if (out.pass.season !== passSeasonId(now)) out = { ...out, pass: freshPass(now) };
  const ev = eventAt(now.getTime());
  if (out.event.period !== ev.period) out = { ...out, event: { period: ev.period, points: 0, claimed: [] } };
  if (out.deals.day !== today) out = { ...out, deals: { day: today, bought: [] } };
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
  const tableGames = { ...st.tableGames };
  if (m.table && m.entry > 0) tableGames[m.table] = (tableGames[m.table] ?? 0) + 1;
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
    tableGames,
    perfectWins: st.perfectWins + (won && m.captured === 0 ? 1 : 0),
    bigCaptureGames: st.bigCaptureGames + (m.captures >= 3 ? 1 : 0),
    duelWins: st.duelWins + (won && m.players === 2 ? 1 : 0),
    sixGames: st.sixGames + (m.players === 6 ? 1 : 0),
    quickGames: st.quickGames + (m.mode === 'quick' ? 1 : 0),
    teamGames: st.teamGames + (m.teams ? 1 : 0),
  };
  const d = advanceMissions(p.missions.daily, m);
  const w = advanceMissions(p.missions.weekly, m);
  const tierBefore = tierFromXp(p.pass.xp);
  const passXp = p.pass.xp + xp;
  const passTiersGained = tierFromXp(passXp) - tierBefore;
  const evPoints = eventPoints(eventAt(now.getTime()).def, m);
  // Cofre por victorias y última ganancia (para duplicarla con un anuncio).
  const need = winsForChest(isVip(p.vipUntil, now.getTime()));
  let chest = { ...p.winChest };
  if (won) {
    chest = { wins: chest.wins + 1, ready: chest.ready };
    if (chest.wins >= need) chest = { wins: 0, ready: chest.ready + 1 };
  }
  const net = coins - m.entry;
  const lastWin = net > 0 ? { id: m.matchId ?? String(now.getTime()), net, doubled: false } : p.lastWin;
  const next: Profile = {
    ...p,
    winChest: chest,
    lastWin,
    xp: p.xp + xp,
    coins: p.coins + coins + levelCoins,
    gems: p.gems + gems,
    stats,
    missions: { ...p.missions, daily: d.list, weekly: w.list },
    pass: { ...p.pass, xp: passXp },
    passTiersTotal: p.passTiersTotal + passTiersGained,
    event: { ...p.event, points: p.event.points + evPoints },
  };
  const u = unlock(next);
  return {
    ok: true,
    profile: u.profile,
    outcome: { coins, entry: m.entry, xp, gems, levelBefore: before, levelAfter: after, levelCoins, passTiersGained, achievements: u.fresh, missions: [...d.completed, ...w.completed], eventPoints: evPoints },
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
  const it = item(itemId);
  // Los avatares con arte se usan como avatar del perfil (se ven en todas las mesas).
  const avatar = it.category === 'avatar' ? `av:${it.id}` : p.avatar;
  return { ok: true, profile: { ...p, avatar, photo: it.category === 'avatar' ? null : p.photo, equipped: { ...p.equipped, [it.category]: itemId } } };
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
  if (pr.kind === 'bundle') {
    p = { ...p, coins: p.coins + (pr.coins ?? 0), gems: p.gems + (pr.gems ?? 0), bundles: [...p.bundles, pr.id] };
    for (const id of pr.itemIds ?? []) if (!p.owned.includes(id)) p = { ...p, owned: [...p.owned, id] };
  }
  p = { ...p, stats: { ...p.stats, purchases: p.stats.purchases + 1 } };
  if (pr.kind === 'vip') {
    const from = Math.max(now.getTime(), p.vipUntil);
    p = { ...p, vipUntil: from + VIP_DAYS * DAY_MS, owned: p.owned.includes('frame-vip') ? p.owned : [...p.owned, 'frame-vip'] };
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
    coins: p.coins + reward.coins * (isVip(p.vipUntil, now.getTime()) ? 2 : 1),
    stats: { ...p.stats, maxDailyStreak: Math.max(p.stats.maxDailyStreak, streak), dailyClaims: p.stats.dailyClaims + 1 },
  });
  return { ok: true, profile: u.profile, coins: reward.coins * (isVip(p.vipUntil, now.getTime()) ? 2 : 1), day: st.day };
}

export function spin(p: Profile, now = new Date(), random = Math.random()): OpResult<{ index: number; coins: number }> | OpFail {
  const today = dayKey(now);
  if (p.daily.lastSpin === today) return fail('Mañana tienes otro giro');
  const index = spinRoulette(random);
  const coins = ROULETTE[index]!.coins;
  return { ok: true, profile: unlock({ ...p, coins: p.coins + coins, daily: { ...p.daily, lastSpin: today }, stats: { ...p.stats, spins: p.stats.spins + 1 } }).profile, index, coins };
}

export function claimMission(p: Profile, id: string): OpResult<{ coins: number; gems: number }> | OpFail {
  const def = missionDef(id);
  const st = [...p.missions.daily, ...p.missions.weekly].find((m) => m.id === id);
  if (!def || !st) return fail('Misión desconocida');
  if (st.claimed) return fail('Ya la reclamaste');
  if (st.progress < def.goal) return fail('Todavía no la completas');
  const upd = (list: MissionState[]) => list.map((m) => (m.id === id ? { ...m, claimed: true } : m));
  const next = { ...p, missions: { ...p.missions, daily: upd(p.missions.daily), weekly: upd(p.missions.weekly) }, coins: p.coins + def.coins, gems: p.gems + def.gems, stats: { ...p.stats, missionsDone: p.stats.missionsDone + 1 } };
  return { ok: true, profile: unlock(next).profile, coins: def.coins, gems: def.gems };
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
  if (patch.avatar !== undefined) {
    const a = String(patch.avatar);
    // Avatar con arte: solo si lo tiene.
    if (a.startsWith('av:')) {
      if (!p.owned.includes(a.slice(3))) return fail('No tienes ese objeto');
      out.avatar = a.slice(0, 40);
    } else out.avatar = a.slice(0, 8) || DEFAULT_AVATAR;
  }
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
  return { ok: true, profile: unlock({ ...p, friends: [...p.friends, { id: String(f.id).slice(0, 16), name: String(f.name).slice(0, 14), avatar: String(f.avatar).slice(0, 40) }] }).profile };
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

// ---------------------------------------------------------------- v0.9: anuncios, eventos, tienda, competencia

/** Monedas por ver un anuncio completo (el servidor valida límite y espera). */
export function claimAd(p0: Profile, now = new Date()): OpResult<{ coins: number; left: number }> | OpFail {
  const p = refresh(p0, now);
  const today = dayKey(now);
  const st = adStatus(p.coins, p.ads, today, now.getTime());
  if (!st.available) return fail(st.reason!);
  const ads = { day: today, count: (p.ads.day === today ? p.ads.count : 0) + 1, lastAt: now.getTime() };
  const u = unlock({ ...p, coins: p.coins + AD_COINS, ads, stats: { ...p.stats, adsWatched: p.stats.adsWatched + 1 } });
  return { ok: true, profile: u.profile, coins: AD_COINS, left: st.left - 1 };
}

/** Reclama un nivel del evento de 15 días. */
export function claimEventTier(p0: Profile, tier: number, now = new Date()): OpResult<{ coins: number; gems: number; itemId: string | null }> | OpFail {
  const p = refresh(p0, now);
  const ev = eventAt(now.getTime()).def;
  const t = ev.tiers[tier];
  if (!t) return fail('Premio desconocido');
  if (p.event.claimed.includes(tier)) return fail('Ya lo reclamaste');
  if (p.event.points < t.goal) return fail('Todavía no llegas a ese premio');
  let next: Profile = {
    ...p,
    coins: p.coins + t.coins,
    gems: p.gems + t.gems,
    event: { ...p.event, claimed: [...p.event.claimed, tier] },
    stats: { ...p.stats, eventTiers: p.stats.eventTiers + 1 },
  };
  if (t.itemId && !next.owned.includes(t.itemId)) next = { ...next, owned: [...next.owned, t.itemId] };
  return { ok: true, profile: unlock(next).profile, coins: t.coins, gems: t.gems, itemId: t.itemId ?? null };
}

/** Compra una oferta del día (objeto de monedas con descuento). */
export function buyDeal(p0: Profile, itemId: string, now = new Date()): OpResult<{ price: number }> | OpFail {
  const p = refresh(p0, now);
  const deal = dailyDeals(dayKey(now)).find((d) => d.itemId === itemId);
  if (!deal) return fail('Esa oferta ya no está');
  if (p.owned.includes(itemId)) return fail('Ya lo tienes');
  if (p.coins < deal.price) return fail('Te faltan monedas');
  const it = item(itemId);
  const u = unlock({
    ...p,
    coins: p.coins - deal.price,
    owned: [...p.owned, itemId],
    equipped: { ...p.equipped, [it.category]: itemId },
    deals: { ...p.deals, bought: [...p.deals.bought, itemId] },
    stats: { ...p.stats, dealsBought: p.stats.dealsBought + 1 },
  });
  return { ok: true, profile: u.profile, price: deal.price };
}

/** Abre un cofre con gemas: objeto sorpresa que no tienes + monedas. */
export function openChest(p: Profile, chestId: string, random = Math.random(), random2 = Math.random()): OpResult<{ itemId: string | null; coins: number }> | OpFail {
  const c = CHESTS.find((x) => x.id === chestId);
  if (!c) return fail('Cofre desconocido');
  if (p.gems < c.gems) return fail('Te faltan gemas');
  const r = chestRoll(c, p.owned, random, random2);
  const next: Profile = {
    ...p,
    gems: p.gems - c.gems,
    coins: p.coins + r.coins,
    owned: r.itemId ? [...p.owned, r.itemId] : p.owned,
    stats: { ...p.stats, chestsOpened: p.stats.chestsOpened + 1 },
  };
  return { ok: true, profile: unlock(next).profile, itemId: r.itemId, coins: r.coins };
}

/** Cambia gemas por monedas. */
export function exchangeGems(p: Profile, gems: number): OpResult<{ coins: number }> | OpFail {
  const x = GEM_EXCHANGE.find((e) => e.gems === gems);
  if (!x) return fail('Cambio desconocido');
  if (p.gems < x.gems) return fail('Te faltan gemas');
  return { ok: true, profile: { ...p, gems: p.gems - x.gems, coins: p.coins + x.coins }, coins: x.coins };
}

/** Premio del ranking semanal (el servidor decide el puesto y evita cobrarlo dos veces). */
export function grantRankPrize(p: Profile, coins: number, gems: number): OpResult {
  return { ok: true, profile: unlock({ ...p, coins: p.coins + coins, gems: p.gems + gems, stats: { ...p.stats, rankRewards: p.stats.rankRewards + 1 } }).profile };
}

/** Inscripción a un torneo. */
export function payTournament(p: Profile, fee: number): OpResult | OpFail {
  if (p.coins < fee) return fail('Te faltan monedas');
  return { ok: true, profile: unlock({ ...p, coins: p.coins - fee, stats: { ...p.stats, tournamentsJoined: p.stats.tournamentsJoined + 1 } }).profile };
}

/** Premio al cerrar un torneo (place: 1 = campeón). */
export function grantTournamentPrize(p: Profile, place: number, coins: number, gems: number): OpResult {
  const st = p.stats;
  return {
    ok: true,
    profile: unlock({
      ...p,
      coins: p.coins + coins,
      gems: p.gems + gems,
      stats: { ...st, tournamentWins: st.tournamentWins + (place === 1 ? 1 : 0), tournamentPodiums: st.tournamentPodiums + (place <= 3 ? 1 : 0), tournamentCoins: st.tournamentCoins + coins },
    }).profile,
  };
}

// ---------------------------------------------------------------- v1.2

/** Abre un cofre de victorias listo. */
export function claimWinChest(p: Profile, random = Math.random()): OpResult<{ coins: number; gems: number }> | OpFail {
  if (p.winChest.ready <= 0) return fail('Todavía no tienes cofre de victorias');
  const r = winChestReward(random);
  const u = unlock({ ...p, coins: p.coins + r.coins, gems: p.gems + r.gems, winChest: { ...p.winChest, ready: p.winChest.ready - 1 } });
  return { ok: true, profile: u.profile, ...r };
}

/** Duplica la ganancia de la última partida (tras ver un anuncio). Una sola vez por partida. */
export function doubleLastWin(p: Profile, matchId: string): OpResult<{ coins: number }> | OpFail {
  const w = p.lastWin;
  if (!w || w.id !== matchId) return fail('No hay premio para duplicar');
  if (w.doubled) return fail('Ya duplicaste este premio');
  return { ok: true, profile: { ...p, coins: p.coins + w.net, lastWin: { ...w, doubled: true } }, coins: w.net };
}

/** Salva la racha diaria si faltaste exactamente un día (cuesta gemas). */
export function saveStreak(p: Profile, now = new Date()): OpResult | OpFail {
  const today = dayKey(now);
  if (!p.daily.lastClaim || p.daily.streak < 2) return fail('No tienes racha que salvar');
  if (daysBetween(p.daily.lastClaim, today) !== 2) return fail('Tu racha no está en peligro');
  if (p.gems < STREAK_SAVE_GEMS) return fail('Te faltan gemas');
  const y = new Date(now.getTime() - DAY_MS);
  return { ok: true, profile: { ...p, gems: p.gems - STREAK_SAVE_GEMS, daily: { ...p.daily, lastClaim: dayKey(y) } } };
}

/** Premio del reto del día (lo llama el servidor cuando ganas el reto). */
export function claimChallenge(p: Profile, now = new Date()): OpResult<{ coins: number; gems: number }> | OpFail {
  const day = dayKey(now);
  if (p.challenge.day === day && p.challenge.done) return fail('Ya ganaste el reto de hoy');
  const c = dailyChallenge(day);
  const u = unlock({ ...p, coins: p.coins + c.coins, gems: p.gems + c.gems, challenge: { day, done: true } });
  return { ok: true, profile: u.profile, coins: c.coins, gems: c.gems };
}

/** Superar una etapa de la Historia (lo llama el servidor cuando ganas esa etapa). */
export function advanceStory(p: Profile, stage: number): OpResult<{ coins: number; gems: number; itemIds: string[] }> | OpFail {
  const st = STORY[stage];
  if (!st) return fail('Etapa desconocida');
  if (stage !== p.story) return fail(stage < p.story ? 'Ya superaste esa etapa' : 'Primero supera las etapas anteriores');
  const newItems = st.reward.itemIds.filter((id) => !p.owned.includes(id));
  const u = unlock({ ...p, story: p.story + 1, coins: p.coins + st.reward.coins, gems: p.gems + st.reward.gems, owned: [...p.owned, ...newItems] });
  return { ok: true, profile: u.profile, coins: st.reward.coins, gems: st.reward.gems, itemIds: newItems };
}

// ------------------------------------------------------------ v1.2 social

/** Bloquear a un jugador (también lo quita de amigos). */
export function blockPlayer(p: Profile, id: string): OpResult | OpFail {
  const x = String(id ?? '').trim().toUpperCase().slice(0, 16);
  if (!x || x === p.id) return fail('Jugador no válido');
  if (p.blocked.includes(x)) return { ok: true, profile: p };
  return { ok: true, profile: { ...p, blocked: [...p.blocked, x].slice(-200), friends: p.friends.filter((f) => f.id !== x) } };
}

export function unblockPlayer(p: Profile, id: string): OpResult {
  return { ok: true, profile: { ...p, blocked: p.blocked.filter((b) => b !== String(id ?? '').toUpperCase()) } };
}

/** Abandono de una partida online: a la tercera en 24 h queda sin partidas online un rato. */
export function recordAbandon(p: Profile, now = Date.now()): OpResult<{ penaltyUntil: number }> {
  const r = abandonPenalty(p.abandons, now);
  const penaltyUntil = Math.max(p.penaltyUntil, r.penaltyUntil);
  return { ok: true, profile: { ...p, abandons: r.abandons, penaltyUntil }, penaltyUntil };
}

/** La cuenta nueva canjea el código de quien la invitó (una sola vez). */
export function redeemReferral(p: Profile, referrer: string): OpResult<{ coins: number }> | OpFail {
  const r = String(referrer ?? '').trim().toUpperCase();
  if (!r || r === p.id) return fail('Código no válido');
  if (p.referredBy) return fail('Ya canjeaste una invitación');
  return { ok: true, profile: { ...p, referredBy: r, coins: p.coins + REFERRAL.newCoins }, coins: REFERRAL.newCoins };
}

/** Premio para quien invitó (hasta REFERRAL.max amigos). */
export function grantReferrer(p: Profile): OpResult<{ coins: number; gems: number }> | OpFail {
  if (p.referrals >= REFERRAL.max) return fail('Llegaste al máximo de invitaciones con premio');
  return { ok: true, profile: { ...p, referrals: p.referrals + 1, coins: p.coins + REFERRAL.coins, gems: p.gems + REFERRAL.gems }, coins: REFERRAL.coins, gems: REFERRAL.gems };
}

/** Premio genérico (cofre del club, torneo relámpago, regalo del administrador). */
export function grantReward(p: Profile, coins: number, gems: number): OpResult {
  return { ok: true, profile: { ...p, coins: Math.max(0, p.coins + Math.trunc(coins)), gems: Math.max(0, p.gems + Math.trunc(gems)) } };
}

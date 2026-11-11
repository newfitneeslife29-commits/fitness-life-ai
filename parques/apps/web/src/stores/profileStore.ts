/**
 * Perfil y progreso del jugador (guardado local): monedas, gemas, XP, estadísticas,
 * logros, objetos, compras, pase de batalla, recompensa diaria y misiones.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { productFor, weekKey } from '@parques/engine';
import { safeStorage } from '../lib/storage';
import { AVATARS } from '../lib/avatars';
import { EMPTY_STATS, newlyUnlocked, type AchievementDef, type ProfileStats } from '../meta/achievements';
import { DEFAULT_EQUIPPED, FREE_ITEMS, item, type Category } from '../meta/catalog';
import { DAILY_REWARDS, ROULETTE, START_COINS, dailyStatus, dayKey, daysBetween, levelFromXp, levelReward, matchRewards, spinRoulette, type MatchSummary } from '../meta/economy';
import { advanceMissions, DAILY_POOL, missionDef, pickMissions, WEEKLY_POOL, type MissionDef, type MissionState } from '../meta/missions';
import { freeReward, passSeasonId, premiumReward, tierFromXp, type PassReward } from '../meta/battlepass';

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

export interface Friend {
  id: string;
  name: string;
  avatar: string;
}

export interface PassState {
  season: string;
  xp: number;
  premium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
}

interface ProfileState {
  id: string;
  name: string;
  avatar: string;
  /** Foto del usuario (data URL JPEG pequeña) o null. */
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
  /** Niveles del pase subidos en total (todas las temporadas). */
  passTiersTotal: number;
  /** Compras con dinero real ya entregadas (evita entregarlas dos veces). */
  grants: string[];

  setIdentity: (p: Partial<Pick<ProfileState, 'name' | 'avatar' | 'country' | 'photo'>>) => void;
  pay: (coins: number) => boolean;
  addCurrency: (coins: number, gems: number) => void;
  spendGems: (n: number) => boolean;
  applyMatch: (m: MatchSummary) => MatchOutcome;
  buy: (id: string) => { ok: boolean; error?: string };
  grantPurchase: (productId: string, grantId: string) => { ok: boolean; label?: string };
  equip: (id: string) => void;
  claimDaily: () => { coins: number; day: number } | null;
  spin: () => { index: number; coins: number } | null;
  refreshMissions: () => void;
  refreshPass: () => void;
  claimPass: (tier: number, track: 'free' | 'premium') => PassReward | null;
  claimMission: (id: string) => { coins: number } | null;
  addFriend: (f: Friend) => void;
  removeFriend: (id: string) => void;
  checkAchievements: () => AchievementDef[];
  setTournamentClaim: (week: string) => void;
  reset: () => void;
}

function randomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function freshPass(): PassState {
  return { season: passSeasonId(), xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
}

function initial() {
  const today = dayKey();
  const week = weekKey(new Date());
  return {
    id: randomId(),
    name: 'Jugador',
    avatar: AVATARS[0] as string,
    photo: null as string | null,
    country: 'CO',
    xp: 0,
    coins: START_COINS,
    gems: 10,
    stats: { ...EMPTY_STATS, tableWins: {} },
    achievements: {} as Record<string, number>,
    owned: [...FREE_ITEMS],
    equipped: { ...DEFAULT_EQUIPPED },
    daily: { lastClaim: null as string | null, streak: 0, lastSpin: null as string | null },
    missions: { day: today, daily: pickMissions(DAILY_POOL, today, 3), week, weekly: pickMissions(WEEKLY_POOL, week, 3) },
    friends: [] as Friend[],
    lastTournamentClaim: null as string | null,
    pass: freshPass(),
    passTiersTotal: 0,
    grants: [] as string[],
  };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => {
      function unlock(): AchievementDef[] {
        const s = get();
        const fresh = newlyUnlocked(
          { stats: s.stats, level: levelFromXp(s.xp).level, owned: s.owned.length, passTiers: s.passTiersTotal },
          s.achievements,
        );
        if (fresh.length) {
          const now = Date.now();
          set({
            achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) },
            coins: s.coins + fresh.reduce((t, a) => t + a.coins, 0),
          });
        }
        return fresh;
      }

      function grantItem(id: string) {
        const s = get();
        if (!s.owned.includes(id)) set({ owned: [...s.owned, id] });
      }

      function applyReward(r: PassReward) {
        const s = get();
        set({ coins: s.coins + (r.coins ?? 0), gems: s.gems + (r.gems ?? 0) });
        if (r.itemId) grantItem(r.itemId);
      }

      return {
        ...initial(),

        setIdentity: (p) => set(p),

        pay: (coins) => {
          if (get().coins < coins) return false;
          set({ coins: get().coins - coins });
          return true;
        },

        addCurrency: (coins, gems) => set((s) => ({ coins: s.coins + coins, gems: s.gems + gems })),

        spendGems: (n) => {
          const s = get();
          if (s.gems < n) return false;
          set({ gems: s.gems - n, stats: { ...s.stats, emotesSent: s.stats.emotesSent + 1 } });
          unlock();
          return true;
        },

        applyMatch: (m) => {
          get().refreshMissions();
          get().refreshPass();
          const s = get();
          const { coins, xp, gems } = matchRewards(m);
          const before = levelFromXp(s.xp).level;
          const after = levelFromXp(s.xp + xp).level;
          let levelCoins = 0;
          for (let l = before + 1; l <= after; l++) levelCoins += levelReward(l).coins;
          const won = m.won;
          const st = s.stats;
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
          const d = advanceMissions(s.missions.daily, m);
          const w = advanceMissions(s.missions.weekly, m);
          const tierBefore = tierFromXp(s.pass.xp);
          const passXp = s.pass.xp + xp;
          const passTiersGained = tierFromXp(passXp) - tierBefore;
          set({
            xp: s.xp + xp,
            coins: s.coins + coins + levelCoins,
            gems: s.gems + gems,
            stats,
            missions: { ...s.missions, daily: d.list, weekly: w.list },
            pass: { ...s.pass, xp: passXp },
            passTiersTotal: s.passTiersTotal + passTiersGained,
          });
          const achievements = unlock();
          return { coins, entry: m.entry, xp, gems, levelBefore: before, levelAfter: after, levelCoins, passTiersGained, achievements, missions: [...d.completed, ...w.completed] };
        },

        buy: (id) => {
          const s = get();
          const it = item(id);
          if (s.owned.includes(id)) return { ok: false, error: 'Ya lo tienes' };
          if (it.currency !== 'coins') return { ok: false, error: 'Este objeto no se compra con monedas' };
          if (s.coins < it.price) return { ok: false, error: 'Te faltan monedas' };
          set({ owned: [...s.owned, id], coins: s.coins - it.price });
          unlock();
          return { ok: true };
        },

        grantPurchase: (productId, grantId) => {
          const s = get();
          if (s.grants.includes(grantId)) return { ok: false };
          const p = productFor(productId);
          if (!p) return { ok: false };
          set({ grants: [...s.grants, grantId] });
          if (p.kind === 'coins') set({ coins: get().coins + (p.coins ?? 0) });
          if (p.kind === 'gems') set({ gems: get().gems + (p.gems ?? 0) });
          if (p.kind === 'item' && p.itemId) {
            grantItem(p.itemId);
            set({ equipped: { ...get().equipped, [item(p.itemId).category]: p.itemId } });
          }
          if (p.kind === 'pass') {
            get().refreshPass();
            const ps = get().pass;
            const extra = (p.passTiers ?? 0) * 150;
            set({ pass: { ...ps, premium: true, xp: ps.xp + extra }, passTiersTotal: get().passTiersTotal + (p.passTiers ?? 0) });
          }
          unlock();
          return { ok: true, label: p.name };
        },

        equip: (id) => {
          const s = get();
          if (!s.owned.includes(id)) return;
          set({ equipped: { ...s.equipped, [item(id).category]: id } });
        },

        claimDaily: () => {
          const s = get();
          const today = dayKey();
          const st = dailyStatus(s.daily.lastClaim, s.daily.streak, today);
          if (!st.canClaim) return null;
          const reward = DAILY_REWARDS[st.day - 1]!;
          // Racha real de días seguidos (no se reinicia al completar la semana).
          const gap = s.daily.lastClaim ? daysBetween(s.daily.lastClaim, today) : 99;
          const run = gap === 1 ? s.daily.streak + 1 : 1;
          const streak = run;
          set({
            daily: { ...s.daily, lastClaim: today, streak },
            coins: s.coins + reward.coins,
            stats: { ...s.stats, maxDailyStreak: Math.max(s.stats.maxDailyStreak, run) },
          });
          unlock();
          return { coins: reward.coins, day: st.day };
        },

        spin: () => {
          const s = get();
          const today = dayKey();
          if (s.daily.lastSpin === today) return null;
          const index = spinRoulette(Math.random());
          set({ daily: { ...s.daily, lastSpin: today } });
          return { index, coins: ROULETTE[index]!.coins };
        },

        refreshMissions: () => {
          const s = get();
          const today = dayKey();
          const week = weekKey(new Date());
          if (s.missions.day === today && s.missions.week === week) return;
          set({
            missions: {
              day: today,
              daily: s.missions.day === today ? s.missions.daily : pickMissions(DAILY_POOL, today, 3),
              week,
              weekly: s.missions.week === week ? s.missions.weekly : pickMissions(WEEKLY_POOL, week, 3),
            },
          });
        },

        refreshPass: () => {
          if (get().pass.season !== passSeasonId()) set({ pass: freshPass() });
        },

        claimPass: (tier, track) => {
          get().refreshPass();
          const s = get();
          const reached = tierFromXp(s.pass.xp);
          if (tier < 1 || tier > reached) return null;
          if (track === 'premium' && !s.pass.premium) return null;
          const list = track === 'free' ? s.pass.claimedFree : s.pass.claimedPremium;
          if (list.includes(tier)) return null;
          const r = track === 'free' ? freeReward(tier) : premiumReward(tier);
          set({ pass: { ...s.pass, [track === 'free' ? 'claimedFree' : 'claimedPremium']: [...list, tier] } });
          applyReward(r);
          unlock();
          return r;
        },

        claimMission: (id) => {
          const s = get();
          const def = missionDef(id);
          const upd = (list: MissionState[]) => list.map((m) => (m.id === id ? { ...m, claimed: true } : m));
          const st = [...s.missions.daily, ...s.missions.weekly].find((m) => m.id === id);
          if (!def || !st || st.claimed || st.progress < def.goal) return null;
          set({ missions: { ...s.missions, daily: upd(s.missions.daily), weekly: upd(s.missions.weekly) }, coins: s.coins + def.coins });
          return { coins: def.coins };
        },

        addFriend: (f) => {
          const s = get();
          if (f.id === s.id || s.friends.some((x) => x.id === f.id)) return;
          set({ friends: [...s.friends, f] });
        },
        removeFriend: (id) => set((s) => ({ friends: s.friends.filter((f) => f.id !== id) })),

        checkAchievements: () => unlock(),
        setTournamentClaim: (week) => set({ lastTournamentClaim: week }),
        reset: () => set(initial()),
      };
    },
    {
      name: 'parques-profile-v1',
      storage: safeStorage,
      version: 2,
      migrate: (old: unknown, version) => {
        const o = (old ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const owned = ((o.owned as string[]) ?? []).filter((id) => ITEM_EXISTS(id));
          return {
            ...o,
            photo: null,
            stats: { ...EMPTY_STATS, ...(o.stats as object), tableWins: {} },
            achievements: {},
            owned: [...new Set([...FREE_ITEMS, ...owned])],
            pass: freshPass(),
            passTiersTotal: 0,
            grants: [],
          };
        }
        return o;
      },
    },
  ),
);

function ITEM_EXISTS(id: string): boolean {
  return item(id).id === id;
}

export function useLevel() {
  const xp = useProfile((p) => p.xp);
  return levelFromXp(xp);
}

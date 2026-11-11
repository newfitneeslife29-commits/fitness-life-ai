/**
 * Perfil y progreso del jugador (guardado local): monedas, gemas, XP, estadísticas,
 * logros, objetos de la tienda, recompensa diaria y misiones.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '../lib/storage';
import { AVATARS } from '../lib/avatars';
import { ACHIEVEMENTS, EMPTY_STATS, newlyUnlocked, type AchievementDef, type ProfileStats } from '../meta/achievements';
import { DEFAULT_EQUIPPED, FREE_ITEMS, item, type Category } from '../meta/catalog';
import {
  DAILY_REWARDS,
  ROULETTE,
  dailyStatus,
  dayKey,
  levelFromXp,
  levelReward,
  matchRewards,
  spinRoulette,
  type MatchSummary,
} from '../meta/economy';
import { advanceMissions, DAILY_POOL, missionDef, pickMissions, WEEKLY_POOL, type MissionDef, type MissionState } from '../meta/missions';
import { weekKey } from '@parques/engine';
import { activeSeason } from '../meta/seasons';

export interface MatchOutcome {
  coins: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  levelCoins: number;
  levelGems: number;
  achievements: AchievementDef[];
  missions: MissionDef[];
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
}

interface ProfileState {
  id: string;
  name: string;
  avatar: string;
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

  setIdentity: (p: Partial<Pick<ProfileState, 'name' | 'avatar' | 'country'>>) => void;
  /** Cobra la entrada de una mesa. Devuelve false si no alcanza. */
  pay: (coins: number) => boolean;
  addCurrency: (coins: number, gems: number) => void;
  applyMatch: (m: MatchSummary) => MatchOutcome;
  buy: (id: string) => { ok: boolean; error?: string };
  equip: (id: string) => void;
  claimDaily: () => { coins: number; gems: number; day: number } | null;
  spin: () => { index: number; coins: number; gems: number } | null;
  refreshMissions: () => void;
  claimMission: (id: string) => { coins: number; gems: number } | null;
  addFriend: (f: Friend) => void;
  removeFriend: (id: string) => void;
  checkAchievements: () => AchievementDef[];
  setTournamentClaim: (week: string) => void;
  /** Solo para pruebas/desarrollo. */
  reset: () => void;
}

function randomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function initial() {
  const today = dayKey();
  const week = weekKey(new Date());
  return {
    id: randomId(),
    name: 'Jugador',
    avatar: AVATARS[0],
    country: 'CO',
    xp: 0,
    coins: 1000,
    gems: 20,
    stats: { ...EMPTY_STATS },
    achievements: {} as Record<string, number>,
    owned: [...FREE_ITEMS],
    equipped: { ...DEFAULT_EQUIPPED },
    daily: { lastClaim: null, streak: 0, lastSpin: null },
    missions: { day: today, daily: pickMissions(DAILY_POOL, today, 3), week, weekly: pickMissions(WEEKLY_POOL, week, 3) },
    friends: [] as Friend[],
    lastTournamentClaim: null,
  };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => {
      function unlock(): AchievementDef[] {
        const s = get();
        const fresh = newlyUnlocked(
          { stats: s.stats, level: levelFromXp(s.xp).level, owned: s.owned.length, dailyStreak: s.daily.streak },
          s.achievements,
        );
        if (fresh.length) {
          const now = Date.now();
          set({
            achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) },
            gems: s.gems + fresh.reduce((t, a) => t + a.gems, 0),
          });
        }
        return fresh;
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

        applyMatch: (m) => {
          get().refreshMissions();
          const s = get();
          const { coins, xp } = matchRewards(m);
          const before = levelFromXp(s.xp).level;
          const after = levelFromXp(s.xp + xp).level;
          let levelCoins = 0;
          let levelGems = 0;
          for (let l = before + 1; l <= after; l++) {
            const r = levelReward(l);
            levelCoins += r.coins;
            levelGems += r.gems;
          }
          const won = m.won;
          const st = s.stats;
          const winStreak = won ? st.winStreak + 1 : 0;
          const stats: ProfileStats = {
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
          };
          const d = advanceMissions(s.missions.daily, m);
          const w = advanceMissions(s.missions.weekly, m);
          set({
            xp: s.xp + xp,
            coins: s.coins + coins + levelCoins,
            gems: s.gems + levelGems,
            stats,
            missions: { ...s.missions, daily: d.list, weekly: w.list },
          });
          const achievements = unlock();
          return { coins, xp, levelBefore: before, levelAfter: after, levelCoins, levelGems, achievements, missions: [...d.completed, ...w.completed] };
        },

        buy: (id) => {
          const s = get();
          const it = item(id);
          if (s.owned.includes(id)) return { ok: false, error: 'Ya lo tienes' };
          if (it.season && activeSeason()?.id !== it.season) return { ok: false, error: 'Solo disponible en su temporada' };
          const have = it.currency === 'coins' ? s.coins : s.gems;
          if (have < it.price) return { ok: false, error: it.currency === 'coins' ? 'Te faltan monedas' : 'Te faltan gemas' };
          set({
            owned: [...s.owned, id],
            coins: it.currency === 'coins' ? s.coins - it.price : s.coins,
            gems: it.currency === 'gems' ? s.gems - it.price : s.gems,
          });
          unlock();
          return { ok: true };
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
          const streak = st.day === 1 ? 1 : s.daily.streak + 1;
          set({ daily: { ...s.daily, lastClaim: today, streak }, coins: s.coins + reward.coins, gems: s.gems + reward.gems });
          unlock();
          return { ...reward, day: st.day };
        },

        spin: () => {
          const s = get();
          const today = dayKey();
          if (s.daily.lastSpin === today) return null;
          const index = spinRoulette(Math.random());
          const r = ROULETTE[index]!;
          set({ daily: { ...s.daily, lastSpin: today } });
          return { index, coins: r.coins, gems: r.gems };
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

        claimMission: (id) => {
          const s = get();
          const def = missionDef(id);
          const upd = (list: MissionState[]) => list.map((m) => (m.id === id ? { ...m, claimed: true } : m));
          const st = [...s.missions.daily, ...s.missions.weekly].find((m) => m.id === id);
          if (!def || !st || st.claimed || st.progress < def.goal) return null;
          set({
            missions: { ...s.missions, daily: upd(s.missions.daily), weekly: upd(s.missions.weekly) },
            coins: s.coins + def.coins,
            gems: s.gems + def.gems,
          });
          return { coins: def.coins, gems: def.gems };
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
    { name: 'parques-profile-v1', storage: safeStorage, version: 1 },
  ),
);

export function useLevel() {
  const xp = useProfile((p) => p.xp);
  return levelFromXp(xp);
}

export { ACHIEVEMENTS };

/**
 * Perfil del jugador = espejo de la cuenta en el SERVIDOR (que es la autoridad).
 * Las acciones (comprar, reclamar, girar la ruleta…) se piden al servidor y el
 * perfil se reemplaza con lo que responde. Aquí no se calculan monedas.
 */
import { create } from 'zustand';
import { levelFromXp, newProfile, type Friend, type PassReward, type Profile, type ProfileOp, type ProfileOpResult } from '@parques/engine';

export type { Friend, Profile };

export interface OpReply<T = Record<string, unknown>> {
  ok: boolean;
  error?: string;
  result?: T;
}

/** Función que envía una operación al servidor (la registra lib/online). */
let sender: ((op: ProfileOp) => Promise<ProfileOpResult>) | null = null;
export function setProfileSender(fn: (op: ProfileOp) => Promise<ProfileOpResult>) {
  sender = fn;
}

interface ProfileState extends Profile {
  /** true cuando ya llegó el perfil del servidor. */
  ready: boolean;
  setFromServer: (p: Profile) => void;
  op: <T = Record<string, unknown>>(op: ProfileOp) => Promise<OpReply<T>>;
  setIdentity: (patch: { name?: string; avatar?: string; photo?: string | null; country?: string }) => Promise<OpReply>;
  buy: (itemId: string) => Promise<OpReply>;
  equip: (itemId: string) => Promise<OpReply>;
  claimDaily: () => Promise<OpReply<{ coins: number; day: number }>>;
  spin: () => Promise<OpReply<{ index: number; coins: number }>>;
  claimMission: (id: string) => Promise<OpReply<{ coins: number }>>;
  claimPass: (tier: number, track: 'free' | 'premium') => Promise<OpReply<{ reward: PassReward }>>;
  addFriend: (f: Friend) => Promise<OpReply>;
  removeFriend: (id: string) => Promise<OpReply>;
  emote: (emoteId: string) => Promise<OpReply<{ glyph: string }>>;
  claimTournament: () => Promise<OpReply<{ coins: number; gems: number; place: number }>>;
  watchedAd: () => Promise<OpReply<{ coins: number; left: number }>>;
  claimEvent: (tier: number) => Promise<OpReply<{ coins: number; gems: number; itemId: string | null }>>;
  buyDeal: (itemId: string) => Promise<OpReply<{ price: number }>>;
  openWinChest: () => Promise<OpReply<{ coins: number; gems: number }>>;
  doubleWin: (matchId: string) => Promise<OpReply<{ coins: number }>>;
  saveStreak: () => Promise<OpReply>;
  claimLeague: () => Promise<OpReply<{ coins: number; gems: number; division: string }>>;
  block: (id: string) => Promise<OpReply>;
  unblock: (id: string) => Promise<OpReply>;
  redeemReferral: (code: string) => Promise<OpReply<{ coins: number }>>;
  claimClubChest: (tier: number) => Promise<OpReply<{ coins: number; gems: number }>>;
  openChest: (chestId: string) => Promise<OpReply<{ itemId: string | null; coins: number }>>;
  exchangeGems: (gems: number) => Promise<OpReply<{ coins: number }>>;
  joinCup: (tier: string) => Promise<OpReply>;
  claimFriendsPrize: () => Promise<OpReply<{ coins: number; gems: number; place: number }>>;
}

export const useProfile = create<ProfileState>()((set, get) => {
  async function op<T>(o: ProfileOp): Promise<OpReply<T>> {
    if (!sender) return { ok: false, error: 'Sin conexión' };
    try {
      const r = await sender(o);
      if (r.profile) get().setFromServer(r.profile);
      return { ok: r.ok, error: r.error, result: r.result as T };
    } catch {
      return { ok: false, error: 'Sin conexión' };
    }
  }
  return {
    ...newProfile('--------'),
    ready: false,
    setFromServer: (p) => set({ ...p, ready: true }),
    op,
    setIdentity: (patch) => op({ op: 'identity', patch }),
    buy: (itemId) => op({ op: 'buy', itemId }),
    equip: (itemId) => op({ op: 'equip', itemId }),
    claimDaily: () => op({ op: 'daily' }),
    spin: () => op({ op: 'spin' }),
    claimMission: (id) => op({ op: 'mission', id }),
    claimPass: (tier, track) => op({ op: 'pass', tier, track }),
    addFriend: (friend) => op({ op: 'friend_add', friend }),
    removeFriend: (id) => op({ op: 'friend_remove', id }),
    emote: (emoteId) => op({ op: 'emote', emoteId }),
    claimTournament: () => op({ op: 'tournament_claim' }),
    watchedAd: () => op({ op: 'ad' }),
    claimEvent: (tier) => op({ op: 'event_claim', tier }),
    buyDeal: (itemId) => op({ op: 'deal', itemId }),
    openWinChest: () => op({ op: 'win_chest' }),
    doubleWin: (matchId) => op({ op: 'double_win', matchId }),
    saveStreak: () => op({ op: 'save_streak' }),
    claimLeague: () => op({ op: 'league_claim' }),
    block: (id) => op({ op: 'block', id }),
    unblock: (id) => op({ op: 'unblock', id }),
    redeemReferral: (code) => op({ op: 'referral', code }),
    claimClubChest: (tier) => op({ op: 'club_chest', tier }),
    openChest: (chestId) => op({ op: 'chest', chestId }),
    exchangeGems: (gems) => op({ op: 'exchange', gems }),
    joinCup: (tier) => op({ op: 'cup_join', tier }),
    claimFriendsPrize: () => op({ op: 'rank_friends_claim' }),
  };
});

export function useLevel() {
  const xp = useProfile((p) => p.xp);
  return levelFromXp(xp);
}

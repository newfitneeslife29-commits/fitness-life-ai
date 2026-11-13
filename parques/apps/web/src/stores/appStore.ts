import { create } from 'zustand';
import type { MatchConfig } from './gameStore';

export type Screen =
  | 'splash'
  | 'lobby'
  | 'tables'
  | 'setup'
  | 'game'
  | 'victory'
  | 'profile'
  | 'shop'
  | 'events'
  | 'ranking'
  | 'settings'
  | 'friends'
  | 'online'
  | 'tournament'
  | 'pass'
  | 'achievements'
  | 'welcome'
  | 'tutorial'
  | 'story'
  | 'vip';
export type SetupMode = MatchConfig['mode'];

interface AppStore {
  screen: Screen;
  setupMode: SetupMode;
  dailyOpen: boolean;
  go: (screen: Screen) => void;
  openSetup: (mode: SetupMode) => void;
  setDailyOpen: (v: boolean) => void;
}

export const useApp = create<AppStore>((set) => ({
  screen: 'splash',
  setupMode: 'ai',
  dailyOpen: false,
  go: (screen) => set({ screen }),
  openSetup: (setupMode) => set({ setupMode, screen: 'setup' }),
  setDailyOpen: (dailyOpen) => set({ dailyOpen }),
}));

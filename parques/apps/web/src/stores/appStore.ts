import { create } from 'zustand';
import type { MatchConfig } from './gameStore';

export type Screen = 'home' | 'setup' | 'game' | 'victory';
export type SetupMode = MatchConfig['mode'];

interface AppStore {
  screen: Screen;
  setupMode: SetupMode;
  go: (screen: Screen) => void;
  openSetup: (mode: SetupMode) => void;
}

export const useApp = create<AppStore>((set) => ({
  screen: 'home',
  setupMode: 'ai',
  go: (screen) => set({ screen }),
  openSetup: (setupMode) => set({ setupMode, screen: 'setup' }),
}));

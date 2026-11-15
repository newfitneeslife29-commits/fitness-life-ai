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
  | 'vip'
  | 'club'
  | 'flash'
  | 'replay';
export type SetupMode = MatchConfig['mode'];

interface AppStore {
  screen: Screen;
  setupMode: SetupMode;
  dailyOpen: boolean;
  go: (screen: Screen) => void;
  openSetup: (mode: SetupMode) => void;
  setDailyOpen: (v: boolean) => void;
  /** Pantallas visitadas (para el botón ←). */
  history: Screen[];
  /** Vuelve a la pantalla anterior (o al inicio). */
  back: () => void;
}

/** Pantallas a las que no se vuelve con ← (partida, carga, registro). */
const NO_RETURN: Screen[] = ['splash', 'welcome', 'tutorial', 'game', 'victory'];

export const useApp = create<AppStore>((set, get) => ({
  screen: 'splash',
  setupMode: 'ai',
  dailyOpen: false,
  history: [],
  go: (screen) =>
    set((st) => {
      if (screen === st.screen) return {};
      // El inicio reinicia el historial; las demás pantallas se apilan (máx. 12).
      const history = screen === 'lobby' || NO_RETURN.includes(screen) ? [] : [...st.history.filter((x) => x !== screen), ...(NO_RETURN.includes(st.screen) ? [] : [st.screen])].slice(-12);
      return { screen, history };
    }),
  openSetup: (setupMode) => {
    set({ setupMode });
    get().go('setup');
  },
  setDailyOpen: (dailyOpen) => set({ dailyOpen }),
  back: () => {
    const h = get().history;
    const prev = h[h.length - 1];
    set({ screen: prev ?? 'lobby', history: h.slice(0, -1) });
  },
}));

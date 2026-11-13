import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HouseRules } from '@parques/engine';
import { safeStorage } from '../lib/storage';

function detectLang(): Lang {
  const l = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2);
  return (['es', 'en', 'pt', 'fr'] as string[]).includes(l) ? (l as Lang) : 'en';
}

export type Theme = 'dark' | 'light';
export type Lang = 'es' | 'en' | 'pt' | 'fr';

export interface Settings {
  sound: boolean;
  music: boolean;
  /** Canción elegida: 'auto' = cumbia en el menú y vallenato en la partida. */
  musicTrack: string;
  vibration: boolean;
  language: Lang;
  theme: Theme;
  /** Reglas de la casa por defecto para todas las mesas. */
  houseRules: Pick<HouseRules, 'soplar' | 'triplePairPenalty' | 'jailAttempts'>;
  turnSeconds: number;
  /** URL del servidor online (vacío = mismo origen). */
  serverUrl: string;
  set: (patch: Partial<Omit<Settings, 'set' | 'setRules'>>) => void;
  setRules: (patch: Partial<Settings['houseRules']>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      sound: true,
      music: true,
      musicTrack: 'auto',
      vibration: true,
      language: detectLang(),
      theme: 'dark',
      houseRules: { soplar: true, triplePairPenalty: true, jailAttempts: 3 },
      turnSeconds: 20,
      serverUrl: '',
      set: (patch) => set(patch),
      setRules: (patch) => set((s) => ({ houseRules: { ...s.houseRules, ...patch } })),
    }),
    { name: 'parques-settings-v1', storage: safeStorage },
  ),
);

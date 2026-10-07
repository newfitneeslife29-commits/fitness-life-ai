import { emptyStats } from './stats';
import { MAX_BET, Stats } from './types';

const KEY = 'fitnesslife.videopoker.v1';

export interface SavedData {
  credits: number;
  bet: number;
  stats: Stats;
  muted?: boolean;
  fourColor?: boolean;
  showHints?: boolean;
}

export function loadSaved(): Partial<SavedData> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Partial<SavedData>;
    const out: Partial<SavedData> = { ...data };
    if (typeof data.credits !== 'number' || data.credits < 0) delete out.credits;
    if (typeof data.bet !== 'number' || data.bet < 1 || data.bet > MAX_BET) delete out.bet;
    if (data.stats) out.stats = { ...emptyStats(), ...data.stats, byRank: { ...emptyStats().byRank, ...data.stats.byRank } };
    return out;
  } catch {
    return {};
  }
}

export function save(data: SavedData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena…): se ignora.
  }
}

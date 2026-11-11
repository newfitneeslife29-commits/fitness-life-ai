/**
 * Persistencia simple en un archivo JSON: jugadores (trofeos), torneos semanales
 * y premios reclamados. Suficiente para un servidor pequeño; se puede cambiar por
 * Supabase/Postgres implementando la misma interfaz.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { RATING_DELTA, TOURNAMENT_POINTS, weekEnd, weekKey } from '@parques/engine';
import type { RankRow, TournamentInfo } from '@parques/engine';

export interface PlayerRecord {
  playerId: string;
  name: string;
  avatar: string;
  country: string;
  rating: number;
  wins: number;
  games: number;
}

interface Data {
  players: Record<string, PlayerRecord>;
  /** weekKey → playerId → { points, games } */
  tournaments: Record<string, Record<string, { points: number; games: number }>>;
  /** weekKey → ids que ya reclamaron */
  claims: Record<string, string[]>;
  /** Compras con dinero real verificadas (id de sesión → registro). */
  purchases: Record<string, { playerId: string; productId: string; at: number }>;
}

export const PRIZES = [
  { place: 1, coins: 5000, gems: 50 },
  { place: 2, coins: 2500, gems: 25 },
  { place: 3, coins: 1000, gems: 10 },
];

export class Store {
  private data: Data = { players: {}, tournaments: {}, claims: {}, purchases: {} };
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private file: string | null) {
    if (file && existsSync(file)) {
      try {
        this.data = { ...this.data, ...JSON.parse(readFileSync(file, 'utf8')) };
      } catch {
        /* archivo dañado: se empieza de cero */
      }
    }
  }

  private save() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      mkdirSync(dirname(this.file!), { recursive: true });
      writeFileSync(this.file!, JSON.stringify(this.data));
    }, 500);
  }

  recordPurchase(grantId: string, playerId: string, productId: string) {
    if (this.data.purchases[grantId]) return;
    this.data.purchases[grantId] = { playerId, productId, at: Date.now() };
    this.save();
  }

  upsertPlayer(p: Omit<PlayerRecord, 'rating' | 'wins' | 'games'>) {
    const cur = this.data.players[p.playerId];
    this.data.players[p.playerId] = { rating: 1000, wins: 0, games: 0, ...cur, ...p };
    this.save();
  }

  /** Registra el resultado de una partida online (ranking de jugadores humanos). */
  recordMatch(ranking: string[], now = new Date()) {
    const wk = weekKey(now);
    const tour = (this.data.tournaments[wk] ??= {});
    ranking.forEach((id, place) => {
      const p = this.data.players[id];
      if (!p) return;
      p.games++;
      if (place === 0) p.wins++;
      p.rating = Math.max(0, p.rating + (RATING_DELTA[place] ?? -12));
      const t = (tour[id] ??= { points: 0, games: 0 });
      t.points += TOURNAMENT_POINTS[place] ?? 1;
      t.games++;
    });
    this.save();
  }

  /** Puesto en el ranking global (1 = primero, Infinity si no tiene partidas). */
  rankOf(playerId: string): number {
    const i = this.ranking('global').findIndex((r) => r.playerId === playerId);
    return i < 0 ? Infinity : i + 1;
  }

  ranking(scope: 'global' | 'country' | 'friends', country?: string, friends?: string[]): RankRow[] {
    let rows = Object.values(this.data.players).filter((p) => p.games > 0 || friends?.includes(p.playerId));
    if (scope === 'country') rows = rows.filter((p) => p.country === country);
    if (scope === 'friends') rows = rows.filter((p) => friends?.includes(p.playerId));
    return rows.sort((a, b) => b.rating - a.rating || b.wins - a.wins).slice(0, 100);
  }

  tournament(now = new Date()): TournamentInfo {
    const wk = weekKey(now);
    const tour = this.data.tournaments[wk] ?? {};
    const rows = Object.entries(tour)
      .map(([playerId, t]) => ({ playerId, name: this.data.players[playerId]?.name ?? '?', avatar: this.data.players[playerId]?.avatar ?? '🙂', points: t.points, games: t.games }))
      .sort((a, b) => b.points - a.points || a.games - b.games)
      .slice(0, 100);
    return { weekKey: wk, endsAt: weekEnd(now), rows, prizes: PRIZES };
  }

  /** Premio de la semana anterior (una sola vez). */
  claimLastWeek(playerId: string, now = new Date()): { ok: boolean; coins?: number; gems?: number; place?: number; error?: string } {
    const last = weekKey(new Date(now.getTime() - 7 * 86400000));
    const tour = this.data.tournaments[last];
    if (!tour) return { ok: false, error: 'La semana pasada no hubo torneo' };
    const order = Object.entries(tour).sort((a, b) => b[1].points - a[1].points || a[1].games - b[1].games).map(([id]) => id);
    const place = order.indexOf(playerId) + 1;
    const prize = PRIZES.find((p) => p.place === place);
    if (!prize) return { ok: false, error: place > 0 ? `Quedaste ${place}º: premios solo para el top 3` : 'No jugaste la semana pasada' };
    const claimed = (this.data.claims[last] ??= []);
    if (claimed.includes(playerId)) return { ok: false, error: 'Ya reclamaste ese premio' };
    claimed.push(playerId);
    this.save();
    return { ok: true, coins: prize.coins, gems: prize.gems, place };
  }
}

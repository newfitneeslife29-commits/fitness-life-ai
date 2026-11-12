/**
 * Base de datos del servidor (SQLite incluido en Node, sin dependencias).
 * Guarda cuentas con su perfil (monedas, gemas, compras, progreso), ranking,
 * torneos semanales y compras con dinero real. El servidor es la autoridad.
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import type { DatabaseSync as DB } from 'node:sqlite';

// node:sqlite se carga con require para que también funcione dentro de Vitest.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
import { levelFromXp, newProfile, normalizeProfile, RATING_DELTA, TOURNAMENT_POINTS, weekEnd, weekKey } from '@parques/engine';
import type { Profile, RankRow, TournamentInfo } from '@parques/engine';

export const PRIZES = [
  { place: 1, coins: 5000, gems: 50 },
  { place: 2, coins: 2500, gems: 25 },
  { place: 3, coins: 1000, gems: 10 },
];

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

function randomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(8);
  return Array.from(b, (x) => chars[x % chars.length]).join('');
}

export class Store {
  private db: DB;

  /** `file` = ruta del archivo .db, o null para una base en memoria (pruebas). */
  constructor(file: string | null) {
    if (file) mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file ?? ':memory:');
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL,
        profile TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        country TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        rating INTEGER NOT NULL DEFAULT 1000,
        wins INTEGER NOT NULL DEFAULT 0,
        games INTEGER NOT NULL DEFAULT 0,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS accounts_rating ON accounts(rating DESC);
      CREATE TABLE IF NOT EXISTS tournaments (week TEXT, player TEXT, points INTEGER, games INTEGER, PRIMARY KEY (week, player));
      CREATE TABLE IF NOT EXISTS claims (week TEXT, player TEXT, PRIMARY KEY (week, player));
      CREATE TABLE IF NOT EXISTS purchases (grant_id TEXT PRIMARY KEY, player TEXT, product TEXT, source TEXT, at INTEGER);
    `);
  }

  close() {
    this.db.close();
  }

  // ------------------------------------------------------------ Cuentas

  /** Crea una cuenta de invitado. El token es secreto (sirve también como código de recuperación). */
  createAccount(now = new Date()): { id: string; token: string; profile: Profile } {
    let id = randomId();
    while (this.db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(id)) id = randomId();
    const token = randomBytes(24).toString('base64url');
    const profile = newProfile(id, now);
    const t = now.getTime();
    this.db
      .prepare('INSERT INTO accounts (id, token_hash, profile, name, avatar, country, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, hash(token), JSON.stringify(profile), profile.name, profile.avatar, profile.country, t, t);
    return { id, token, profile };
  }

  /** Verifica id + token y devuelve el perfil (o null). */
  auth(id: string, token: string): Profile | null {
    const row = this.db.prepare('SELECT token_hash, profile FROM accounts WHERE id = ?').get(String(id)) as { token_hash: string; profile: string } | undefined;
    if (!row || row.token_hash !== hash(String(token))) return null;
    return normalizeProfile(JSON.parse(row.profile));
  }

  getProfile(id: string): Profile | null {
    const row = this.db.prepare('SELECT profile FROM accounts WHERE id = ?').get(id) as { profile: string } | undefined;
    return row ? normalizeProfile(JSON.parse(row.profile)) : null;
  }

  saveProfile(p: Profile) {
    this.db
      .prepare('UPDATE accounts SET profile = ?, name = ?, avatar = ?, country = ?, level = ?, updated = ? WHERE id = ?')
      .run(JSON.stringify(p), p.name, p.photo ?? p.avatar, p.country, levelFromXp(p.xp).level, Date.now(), p.id);
  }

  /** Lee, modifica y guarda un perfil en una transacción. */
  update<T extends { ok: boolean; profile?: Profile }>(id: string, fn: (p: Profile) => T): T | { ok: false; error: string } {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const p = this.getProfile(id);
      if (!p) {
        this.db.exec('ROLLBACK');
        return { ok: false, error: 'Cuenta no encontrada' };
      }
      const r = fn(p);
      if (r.ok && r.profile) this.saveProfile(r.profile);
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  levelOf(id: string): number {
    const row = this.db.prepare('SELECT level FROM accounts WHERE id = ?').get(id) as { level: number } | undefined;
    return row?.level ?? 1;
  }

  // ------------------------------------------------------------ Ranking y torneo

  /** Registra el resultado de una partida online entre personas (trofeos y torneo). */
  recordMatch(ranking: string[], now = new Date()) {
    const wk = weekKey(now);
    ranking.forEach((id, place) => {
      this.db
        .prepare('UPDATE accounts SET games = games + 1, wins = wins + ?, rating = MAX(0, rating + ?) WHERE id = ?')
        .run(place === 0 ? 1 : 0, RATING_DELTA[place] ?? -12, id);
      this.db
        .prepare('INSERT INTO tournaments (week, player, points, games) VALUES (?, ?, ?, 1) ON CONFLICT(week, player) DO UPDATE SET points = points + excluded.points, games = games + 1')
        .run(wk, id, TOURNAMENT_POINTS[place] ?? 1);
    });
  }

  rankOf(playerId: string): number {
    const me = this.db.prepare('SELECT rating, wins, games FROM accounts WHERE id = ?').get(playerId) as { rating: number; wins: number; games: number } | undefined;
    if (!me || me.games === 0) return Infinity;
    const better = this.db
      .prepare('SELECT COUNT(*) AS n FROM accounts WHERE games > 0 AND (rating > ? OR (rating = ? AND wins > ?))')
      .get(me.rating, me.rating, me.wins) as { n: number };
    return better.n + 1;
  }

  ranking(scope: 'global' | 'country' | 'friends', country?: string, friends?: string[]): RankRow[] {
    const cols = 'id AS playerId, name, avatar, country, rating, wins, games';
    let rows: RankRow[];
    if (scope === 'friends') {
      const ids = (friends ?? []).slice(0, 200);
      if (!ids.length) return [];
      rows = this.db.prepare(`SELECT ${cols} FROM accounts WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as unknown as RankRow[];
    } else if (scope === 'country') {
      rows = this.db.prepare(`SELECT ${cols} FROM accounts WHERE games > 0 AND country = ? ORDER BY rating DESC, wins DESC LIMIT 100`).all(String(country ?? '')) as unknown as RankRow[];
    } else {
      rows = this.db.prepare(`SELECT ${cols} FROM accounts WHERE games > 0 ORDER BY rating DESC, wins DESC LIMIT 100`).all() as unknown as RankRow[];
    }
    return rows.sort((a, b) => b.rating - a.rating || b.wins - a.wins);
  }

  tournament(now = new Date()): TournamentInfo {
    const wk = weekKey(now);
    const rows = this.db
      .prepare('SELECT t.player AS playerId, a.name AS name, a.avatar AS avatar, t.points AS points, t.games AS games FROM tournaments t JOIN accounts a ON a.id = t.player WHERE t.week = ? ORDER BY t.points DESC, t.games ASC LIMIT 100')
      .all(wk) as unknown as TournamentInfo['rows'];
    return { weekKey: wk, endsAt: weekEnd(now), rows, prizes: PRIZES };
  }

  /** Premio del torneo de la semana pasada (se entrega al perfil en el servidor, una sola vez). */
  claimLastWeek(playerId: string, now = new Date()): { ok: boolean; coins?: number; gems?: number; place?: number; error?: string } {
    const last = weekKey(new Date(now.getTime() - 7 * 86400000));
    const order = this.db.prepare('SELECT player FROM tournaments WHERE week = ? ORDER BY points DESC, games ASC').all(last) as { player: string }[];
    if (!order.length) return { ok: false, error: 'La semana pasada no hubo torneo' };
    const place = order.findIndex((r) => r.player === playerId) + 1;
    const prize = PRIZES.find((p) => p.place === place);
    if (!prize) return { ok: false, error: place > 0 ? `Quedaste ${place}º: premios solo para el top 3` : 'No jugaste la semana pasada' };
    if (this.db.prepare('SELECT 1 FROM claims WHERE week = ? AND player = ?').get(last, playerId)) return { ok: false, error: 'Ya reclamaste ese premio' };
    this.db.prepare('INSERT INTO claims (week, player) VALUES (?, ?)').run(last, playerId);
    const r = this.update(playerId, (p) => ({ ok: true, profile: { ...p, coins: p.coins + prize.coins, gems: p.gems + prize.gems } }));
    if (!r.ok) return { ok: false, error: 'Cuenta no encontrada' };
    return { ok: true, coins: prize.coins, gems: prize.gems, place };
  }

  // ------------------------------------------------------------ Compras

  /** Registra una compra verificada. Devuelve false si ya se había registrado (no se entrega dos veces). */
  recordPurchase(grantId: string, playerId: string, productId: string, source = 'stripe'): boolean {
    const r = this.db.prepare('INSERT OR IGNORE INTO purchases (grant_id, player, product, source, at) VALUES (?, ?, ?, ?, ?)').run(grantId, playerId, productId, source, Date.now());
    return Number(r.changes) > 0;
  }
}

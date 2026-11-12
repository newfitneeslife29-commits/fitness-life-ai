/**
 * Base de datos del servidor: PostgreSQL.
 *  - Producción: la base de Supabase (DATABASE_URL), en su propio esquema `parques`,
 *    separado de las tablas de Fitness Life.
 *  - Desarrollo y pruebas: PGlite (Postgres embebido, sin instalar nada), en una carpeta o en memoria.
 * Guarda cuentas con su perfil (monedas, gemas, compras, progreso), ranking, torneos semanales
 * y compras con dinero real. El servidor es la autoridad: los clientes nunca escriben aquí.
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { levelFromXp, newProfile, normalizeProfile, RATING_DELTA, TOURNAMENT_POINTS, weekEnd, weekKey } from '@parques/engine';
import type { Profile, RankRow, TournamentInfo } from '@parques/engine';

export const PRIZES = [
  { place: 1, coins: 5000, gems: 50 },
  { place: 2, coins: 2500, gems: 25 },
  { place: 3, coins: 1000, gems: 10 },
];

/** Esquema de la base (idempotente: se aplica al arrancar). */
export const SCHEMA = `
-- En Supabase el esquema ya existe (creado para el usuario parques_server, que no puede crear esquemas).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'parques') THEN CREATE SCHEMA parques; END IF;
END $$;
CREATE TABLE IF NOT EXISTS parques.accounts (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  profile JSONB NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  country TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_rating ON parques.accounts (rating DESC, wins DESC) WHERE games > 0;
CREATE TABLE IF NOT EXISTS parques.tournaments (
  week TEXT NOT NULL, player TEXT NOT NULL REFERENCES parques.accounts(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, games INTEGER NOT NULL, PRIMARY KEY (week, player)
);
CREATE TABLE IF NOT EXISTS parques.claims (week TEXT NOT NULL, player TEXT NOT NULL, PRIMARY KEY (week, player));
CREATE TABLE IF NOT EXISTS parques.purchases (
  grant_id TEXT PRIMARY KEY, player TEXT NOT NULL, product TEXT NOT NULL, source TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Solo el servidor (rol dueño) lee y escribe: con RLS activo y sin políticas, la API pública de Supabase no ve nada.
ALTER TABLE parques.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.purchases ENABLE ROW LEVEL SECURITY;
`;

// ------------------------------------------------------------ Conexión (pg o PGlite)
interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
interface Db extends Sql {
  tx<T>(fn: (q: Sql) => Promise<T>): Promise<T>;
  /** Varias sentencias sin parámetros (el esquema). */
  exec(text: string): Promise<void>;
  close(): Promise<void>;
}

async function openPostgres(url: string): Promise<Db> {
  const { default: pg } = await import('pg');
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /sslmode=disable/.test(url);
  // Supabase exige TLS; su certificado no está en el almacén de Node, así que no se verifica la cadena.
  const pool = new pg.Pool({ connectionString: url, max: 10, ssl: local ? undefined : { rejectUnauthorized: false } });
  pool.on('error', (e) => console.error('[db]', e.message));
  return {
    query: async (text, params) => (await pool.query(text, params as unknown[])).rows,
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await fn({ query: async (text, params) => (await client.query(text, params as unknown[])).rows });
        await client.query('COMMIT');
        return r;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    exec: async (text) => {
      await pool.query(text);
    },
    close: () => pool.end(),
  };
}

async function openPglite(dir: string | null): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dir) mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir ?? undefined);
  const wrap = (q: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Sql => ({
    query: async <T>(text: string, params?: unknown[]) => (await q.query(text, params)).rows as T[],
  });
  return {
    ...wrap(db),
    tx: (fn) => db.transaction((t) => fn(wrap(t))),
    exec: async (text) => {
      await db.exec(text);
    },
    close: () => db.close(),
  };
}

export interface StoreOptions {
  /** URL de Postgres (Supabase). Si falta se usa PGlite. */
  url?: string | null;
  /** Carpeta de PGlite (desarrollo); null = en memoria (pruebas). */
  dir?: string | null;
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

function randomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(8);
  return Array.from(b, (x) => chars[x % chars.length]).join('');
}

type UpdateResult<T> = T | { ok: false; error: string };

export class Store {
  private db: Promise<Db>;

  constructor(opts: StoreOptions = {}) {
    this.db = (async () => {
      const db = opts.url ? await openPostgres(opts.url) : await openPglite(opts.dir ?? null);
      await db.exec(SCHEMA);
      return db;
    })();
  }

  /** Espera a que la base esté lista (falla si no se puede conectar). */
  async ready(): Promise<void> {
    await this.db;
  }

  async close() {
    await (await this.db).close();
  }

  // ------------------------------------------------------------ Cuentas

  /** Crea una cuenta de invitado. El token es secreto (sirve también como código de recuperación). */
  async createAccount(now = new Date()): Promise<{ id: string; token: string; profile: Profile }> {
    const db = await this.db;
    const token = randomBytes(24).toString('base64url');
    for (;;) {
      const id = randomId();
      const profile = newProfile(id, now);
      const rows = await db.query(
        'INSERT INTO parques.accounts (id, token_hash, profile, name, avatar, country, created, updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $7) ON CONFLICT (id) DO NOTHING RETURNING id',
        [id, hash(token), JSON.stringify(profile), profile.name, profile.avatar, profile.country, now],
      );
      if (rows.length) return { id, token, profile };
    }
  }

  /** Verifica id + token y devuelve el perfil (o null). */
  async auth(id: string, token: string): Promise<Profile | null> {
    const db = await this.db;
    const [row] = await db.query<{ token_hash: string; profile: Profile }>('SELECT token_hash, profile FROM parques.accounts WHERE id = $1', [String(id)]);
    if (!row || row.token_hash !== hash(String(token))) return null;
    return normalizeProfile(row.profile);
  }

  async getProfile(id: string): Promise<Profile | null> {
    const db = await this.db;
    const [row] = await db.query<{ profile: Profile }>('SELECT profile FROM parques.accounts WHERE id = $1', [String(id)]);
    return row ? normalizeProfile(row.profile) : null;
  }

  private async updateIn<T extends { ok: boolean; profile?: Profile }>(q: Sql, id: string, fn: (p: Profile) => T): Promise<UpdateResult<T>> {
    const [row] = await q.query<{ profile: Profile }>('SELECT profile FROM parques.accounts WHERE id = $1 FOR UPDATE', [String(id)]);
    if (!row) return { ok: false, error: 'Cuenta no encontrada' };
    const r = fn(normalizeProfile(row.profile));
    if (r.ok && r.profile) {
      const p = r.profile;
      await q.query('UPDATE parques.accounts SET profile = $1, name = $2, avatar = $3, country = $4, level = $5, updated = now() WHERE id = $6', [
        JSON.stringify(p),
        p.name,
        p.photo ?? p.avatar,
        p.country,
        levelFromXp(p.xp).level,
        p.id,
      ]);
    }
    return r;
  }

  /** Lee, modifica y guarda un perfil en una transacción (bloquea la fila mientras tanto). */
  async update<T extends { ok: boolean; profile?: Profile }>(id: string, fn: (p: Profile) => T): Promise<UpdateResult<T>> {
    return (await this.db).tx((q) => this.updateIn(q, id, fn));
  }

  // ------------------------------------------------------------ Ranking y torneo

  /** Registra el resultado de una partida online entre personas (trofeos y torneo). */
  async recordMatch(ranking: string[], now = new Date()) {
    const wk = weekKey(now);
    await (await this.db).tx(async (q) => {
      for (const [place, id] of ranking.entries()) {
        await q.query('UPDATE parques.accounts SET games = games + 1, wins = wins + $1, rating = GREATEST(0, rating + $2) WHERE id = $3', [
          place === 0 ? 1 : 0,
          RATING_DELTA[place] ?? -12,
          id,
        ]);
        await q.query(
          'INSERT INTO parques.tournaments (week, player, points, games) VALUES ($1, $2, $3, 1) ON CONFLICT (week, player) DO UPDATE SET points = parques.tournaments.points + excluded.points, games = parques.tournaments.games + 1',
          [wk, id, TOURNAMENT_POINTS[place] ?? 1],
        );
      }
    });
  }

  async rankOf(playerId: string): Promise<number> {
    const db = await this.db;
    const [me] = await db.query<{ rating: number; wins: number; games: number }>('SELECT rating, wins, games FROM parques.accounts WHERE id = $1', [playerId]);
    if (!me || me.games === 0) return Infinity;
    const [better] = await db.query<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM parques.accounts WHERE games > 0 AND (rating > $1 OR (rating = $1 AND wins > $2))',
      [me.rating, me.wins],
    );
    return better!.n + 1;
  }

  async ranking(scope: 'global' | 'country' | 'friends', country?: string, friends?: string[]): Promise<RankRow[]> {
    const db = await this.db;
    const cols = 'id AS "playerId", name, avatar, country, rating, wins, games';
    let rows: RankRow[];
    if (scope === 'friends') {
      const ids = (friends ?? []).slice(0, 200).map(String);
      if (!ids.length) return [];
      rows = await db.query<RankRow>(`SELECT ${cols} FROM parques.accounts WHERE id = ANY($1::text[])`, [ids]);
    } else if (scope === 'country') {
      rows = await db.query<RankRow>(`SELECT ${cols} FROM parques.accounts WHERE games > 0 AND country = $1 ORDER BY rating DESC, wins DESC LIMIT 100`, [String(country ?? '')]);
    } else {
      rows = await db.query<RankRow>(`SELECT ${cols} FROM parques.accounts WHERE games > 0 ORDER BY rating DESC, wins DESC LIMIT 100`);
    }
    return rows.sort((a, b) => b.rating - a.rating || b.wins - a.wins);
  }

  async tournament(now = new Date()): Promise<TournamentInfo> {
    const wk = weekKey(now);
    const rows = await (await this.db).query<TournamentInfo['rows'][number]>(
      'SELECT t.player AS "playerId", a.name AS name, a.avatar AS avatar, t.points AS points, t.games AS games FROM parques.tournaments t JOIN parques.accounts a ON a.id = t.player WHERE t.week = $1 ORDER BY t.points DESC, t.games ASC LIMIT 100',
      [wk],
    );
    return { weekKey: wk, endsAt: weekEnd(now), rows, prizes: PRIZES };
  }

  /** Premio del torneo de la semana pasada (se entrega al perfil en el servidor, una sola vez). */
  async claimLastWeek(playerId: string, now = new Date()): Promise<{ ok: boolean; coins?: number; gems?: number; place?: number; error?: string }> {
    const last = weekKey(new Date(now.getTime() - 7 * 86400000));
    return (await this.db).tx(async (q) => {
      const order = await q.query<{ player: string }>('SELECT player FROM parques.tournaments WHERE week = $1 ORDER BY points DESC, games ASC LIMIT 3', [last]);
      if (!order.length) return { ok: false, error: 'La semana pasada no hubo torneo' };
      const place = order.findIndex((r) => r.player === playerId) + 1;
      const prize = PRIZES.find((p) => p.place === place);
      if (!prize) return { ok: false, error: 'Premios solo para el top 3' };
      const ins = await q.query('INSERT INTO parques.claims (week, player) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING player', [last, playerId]);
      if (!ins.length) return { ok: false, error: 'Ya reclamaste ese premio' };
      const r = await this.updateIn(q, playerId, (p) => ({ ok: true, profile: { ...p, coins: p.coins + prize.coins, gems: p.gems + prize.gems } }));
      if (!r.ok) throw new Error('Cuenta no encontrada');
      return { ok: true, coins: prize.coins, gems: prize.gems, place };
    });
  }

  // ------------------------------------------------------------ Compras

  /**
   * Registra una compra verificada y la entrega en la misma transacción.
   * Devuelve false si ya se había entregado (nunca se entrega dos veces) o si la entrega falla.
   */
  async creditPurchase(grantId: string, playerId: string, productId: string, source: string, grant: (p: Profile) => { ok: boolean; profile?: Profile }): Promise<boolean> {
    return (await this.db).tx(async (q) => {
      const ins = await q.query('INSERT INTO parques.purchases (grant_id, player, product, source) VALUES ($1, $2, $3, $4) ON CONFLICT (grant_id) DO NOTHING RETURNING grant_id', [
        grantId,
        playerId,
        productId,
        source,
      ]);
      if (!ins.length) return false;
      const r = await this.updateIn(q, playerId, grant);
      if (!r.ok) throw new Error('No se pudo entregar la compra');
      return true;
    }).catch(() => false);
  }
}

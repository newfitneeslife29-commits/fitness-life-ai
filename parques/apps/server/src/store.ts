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
import {
  grantRankPrize,
  grantTournamentPrize,
  levelFromXp,
  newProfile,
  normalizeProfile,
  payTournament,
  rankPrize,
  RATING_DELTA,
  TOURNAMENT_GEMS,
  TOURNAMENT_POINTS,
  TOURNAMENT_TIERS,
  tournamentPrizes,
  tournamentTier,
  weekEnd,
  weekKey,
} from '@parques/engine';
import type { CupInfo, HallOfFame, Profile, PublicPlayer, RankRow, RankRewardsInfo, TournamentInfo } from '@parques/engine';

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
CREATE TABLE IF NOT EXISTS parques.cups (
  week TEXT NOT NULL, tier TEXT NOT NULL, player TEXT NOT NULL REFERENCES parques.accounts(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0, games INTEGER NOT NULL DEFAULT 0, fee INTEGER NOT NULL DEFAULT 0,
  joined TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (week, tier, player)
);
CREATE TABLE IF NOT EXISTS parques.cup_results (
  week TEXT NOT NULL, tier TEXT NOT NULL, player TEXT NOT NULL, place INTEGER NOT NULL, coins INTEGER NOT NULL, gems INTEGER NOT NULL,
  PRIMARY KEY (week, tier, player)
);
CREATE TABLE IF NOT EXISTS parques.settled (what TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS parques.rank_results (
  week TEXT NOT NULL, scope TEXT NOT NULL, player TEXT NOT NULL, place INTEGER NOT NULL, coins INTEGER NOT NULL, gems INTEGER NOT NULL,
  PRIMARY KEY (week, scope, player)
);
CREATE TABLE IF NOT EXISTS parques.identities (
  provider TEXT NOT NULL, subject TEXT NOT NULL, account TEXT NOT NULL REFERENCES parques.accounts(id) ON DELETE CASCADE,
  email TEXT, created TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (provider, subject)
);
CREATE TABLE IF NOT EXISTS parques.sessions (
  token_hash TEXT PRIMARY KEY, account TEXT NOT NULL REFERENCES parques.accounts(id) ON DELETE CASCADE,
  created TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Solo el servidor (rol dueño) lee y escribe: con RLS activo y sin políticas, la API pública de Supabase no ve nada.
ALTER TABLE parques.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.cup_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.settled ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.rank_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE parques.sessions ENABLE ROW LEVEL SECURITY;
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
    if (!row) return null;
    const h = hash(String(token));
    if (row.token_hash !== h) {
      const [sess] = await db.query('SELECT 1 FROM parques.sessions WHERE token_hash = $1 AND account = $2', [h, String(id)]);
      if (!sess) return null;
    }
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

  // ------------------------------------------------------------ v0.9: inicio de sesión con Apple / Google

  /** Cuenta vinculada a una identidad de Apple o Google. */
  async accountFor(provider: string, subject: string): Promise<string | null> {
    const [row] = await (await this.db).query<{ account: string }>('SELECT account FROM parques.identities WHERE provider = $1 AND subject = $2', [provider, subject]);
    return row?.account ?? null;
  }

  /** Vincula la identidad a la cuenta (false si ya pertenece a otra). */
  async linkIdentity(provider: string, subject: string, account: string, email: string | null): Promise<boolean> {
    const rows = await (await this.db).query(
      'INSERT INTO parques.identities (provider, subject, account, email) VALUES ($1, $2, $3, $4) ON CONFLICT (provider, subject) DO NOTHING RETURNING account',
      [provider, subject, account, email],
    );
    return rows.length > 0;
  }

  /** Abre una sesión nueva para la cuenta (otro dispositivo) y devuelve su token. */
  async newSession(account: string): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    await (await this.db).query('INSERT INTO parques.sessions (token_hash, account) VALUES ($1, $2)', [hash(token), account]);
    return token;
  }

  // ------------------------------------------------------------ v0.9: amigos

  async publicPlayer(id: string): Promise<Omit<PublicPlayer, 'online'> | null> {
    const [r] = await (await this.db).query<{ id: string; name: string; avatar: string; country: string; level: number; rating: number; wins: number; games: number }>(
      'SELECT id, name, avatar, country, level, rating, wins, games FROM parques.accounts WHERE id = $1',
      [String(id).trim().toUpperCase().slice(0, 16)],
    );
    return r ?? null;
  }

  // ------------------------------------------------------------ v0.9: copas (torneos con inscripción)

  async joinCup(playerId: string, tierId: string, now = new Date()): Promise<{ ok: boolean; error?: string; profile?: Profile }> {
    const tier = tournamentTier(tierId);
    if (!tier || tier.fee <= 0) return { ok: false, error: 'Torneo desconocido' };
    const wk = weekKey(now);
    return (await this.db).tx(async (q) => {
      const [acc] = await q.query<{ level: number }>('SELECT level FROM parques.accounts WHERE id = $1', [playerId]);
      if (!acc) return { ok: false, error: 'Cuenta no encontrada' };
      if (acc.level < tier.minLevel) return { ok: false, error: `Necesitas nivel ${tier.minLevel}` };
      const ins = await q.query('INSERT INTO parques.cups (week, tier, player, fee) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING player', [wk, tier.id, playerId, tier.fee]);
      if (!ins.length) return { ok: false, error: 'Ya estás inscrito' };
      const r = await this.updateIn(q, playerId, (p) => payTournament(p, tier.fee));
      if (!r.ok) throw new Error('error' in r ? r.error : 'No se pudo inscribir');
      return { ok: true, profile: r.profile };
    }).catch((e: Error) => ({ ok: false, error: e.message || 'No se pudo inscribir' }));
  }

  async cupEntry(playerId: string, tierId: string, now = new Date()): Promise<{ games: number } | null> {
    const [r] = await (await this.db).query<{ games: number }>('SELECT games FROM parques.cups WHERE week = $1 AND tier = $2 AND player = $3', [weekKey(now), tierId, playerId]);
    return r ?? null;
  }

  /** Suma los puntos de una partida de copa (solo a inscritos y hasta el máximo de partidas). */
  async recordCup(tierId: string, ranking: string[], now = new Date()) {
    const tier = tournamentTier(tierId);
    if (!tier) return;
    const wk = weekKey(now);
    const db = await this.db;
    for (const [place, id] of ranking.entries()) {
      await db.query('UPDATE parques.cups SET points = points + $1, games = games + 1 WHERE week = $2 AND tier = $3 AND player = $4 AND games < $5', [
        TOURNAMENT_POINTS[place] ?? 1,
        wk,
        tier.id,
        id,
        tier.maxGames,
      ]);
    }
  }

  async cups(playerId: string, now = new Date()): Promise<CupInfo[]> {
    const db = await this.db;
    const wk = weekKey(now);
    const out: CupInfo[] = [];
    for (const tier of TOURNAMENT_TIERS) {
      let rows: CupInfo['rows'];
      let players: number;
      let mine: { games: number } | undefined;
      let fees = 0;
      if (tier.fee === 0) {
        rows = await db.query('SELECT t.player AS "playerId", a.name, a.avatar, t.points, t.games FROM parques.tournaments t JOIN parques.accounts a ON a.id = t.player WHERE t.week = $1 ORDER BY t.points DESC, t.games ASC LIMIT 50', [wk]);
        const [c] = await db.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM parques.tournaments WHERE week = $1', [wk]);
        players = c!.n;
        [mine] = await db.query<{ games: number }>('SELECT games FROM parques.tournaments WHERE week = $1 AND player = $2', [wk, playerId]);
      } else {
        rows = await db.query('SELECT c.player AS "playerId", a.name, a.avatar, c.points, c.games FROM parques.cups c JOIN parques.accounts a ON a.id = c.player WHERE c.week = $1 AND c.tier = $2 ORDER BY c.points DESC, c.games ASC LIMIT 50', [wk, tier.id]);
        const [c] = await db.query<{ n: number; fees: number }>('SELECT COUNT(*)::int AS n, COALESCE(SUM(fee), 0)::int AS fees FROM parques.cups WHERE week = $1 AND tier = $2', [wk, tier.id]);
        players = c!.n;
        fees = c!.fees;
        [mine] = await db.query<{ games: number }>('SELECT games FROM parques.cups WHERE week = $1 AND tier = $2 AND player = $3', [wk, tier.id, playerId]);
      }
      const pool = fees + tier.houseBonus;
      out.push({ tier: tier.id, weekKey: wk, endsAt: weekEnd(now), joined: tier.fee === 0 || !!mine, myGames: mine?.games ?? 0, players, pool, prizes: tournamentPrizes(pool, Math.max(players, 10)), rows });
    }
    return out;
  }

  /** Cierra las copas de una semana: reparte el bote a los 10 primeros (una sola vez). Devuelve a quién se le pagó. */
  async settleCups(week: string): Promise<{ playerId: string; tier: string; place: number; coins: number }[]> {
    const db = await this.db;
    const paid: { playerId: string; tier: string; place: number; coins: number }[] = [];
    for (const tier of TOURNAMENT_TIERS) {
      const done = await db.tx(async (q) => {
        const mark = await q.query('INSERT INTO parques.settled (what) VALUES ($1) ON CONFLICT DO NOTHING RETURNING what', [`cup:${week}:${tier.id}`]);
        if (!mark.length) return [];
        const rows =
          tier.fee === 0
            ? await q.query<{ player: string; points: number }>('SELECT player, points FROM parques.tournaments WHERE week = $1 AND points > 0 ORDER BY points DESC, games ASC LIMIT 10', [week])
            : await q.query<{ player: string; points: number }>('SELECT player, points FROM parques.cups WHERE week = $1 AND tier = $2 AND games > 0 ORDER BY points DESC, games ASC LIMIT 10', [week, tier.id]);
        const [c] = tier.fee === 0 ? [{ fees: 0 }] : await q.query<{ fees: number }>('SELECT COALESCE(SUM(fee), 0)::int AS fees FROM parques.cups WHERE week = $1 AND tier = $2', [week, tier.id]);
        const prizes = tournamentPrizes(c!.fees + tier.houseBonus, rows.length);
        const out: typeof paid = [];
        for (const [i, r] of rows.entries()) {
          const coins = prizes[i] ?? 0;
          const gems = TOURNAMENT_GEMS[i] ?? 0;
          await q.query('INSERT INTO parques.cup_results (week, tier, player, place, coins, gems) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING', [week, tier.id, r.player, i + 1, coins, gems]);
          await this.updateIn(q, r.player, (p) => grantTournamentPrize(p, i + 1, coins, gems));
          out.push({ playerId: r.player, tier: tier.id, place: i + 1, coins });
        }
        return out;
      });
      paid.push(...done);
    }
    return paid;
  }

  async hallOfFame(): Promise<HallOfFame> {
    const db = await this.db;
    const wins = await db.query<HallOfFame['wins'][number]>(
      'SELECT r.player AS "playerId", a.name, a.avatar, COUNT(*)::int AS value FROM parques.cup_results r JOIN parques.accounts a ON a.id = r.player WHERE r.place = 1 GROUP BY r.player, a.name, a.avatar ORDER BY value DESC LIMIT 50',
    );
    const coins = await db.query<HallOfFame['coins'][number]>(
      'SELECT r.player AS "playerId", a.name, a.avatar, SUM(r.coins)::bigint AS value FROM parques.cup_results r JOIN parques.accounts a ON a.id = r.player GROUP BY r.player, a.name, a.avatar ORDER BY value DESC LIMIT 50',
    );
    return { wins, coins: coins.map((c) => ({ ...c, value: Number(c.value) })) };
  }

  // ------------------------------------------------------------ v0.9: premios del ranking

  /** Al cerrar la semana: premios para el top 100 global y el top 50 de cada país (una sola vez). */
  async settleRanking(week: string): Promise<{ playerId: string; scope: string; place: number; coins: number }[]> {
    const db = await this.db;
    return db.tx(async (q) => {
      const mark = await q.query('INSERT INTO parques.settled (what) VALUES ($1) ON CONFLICT DO NOTHING RETURNING what', [`rank:${week}`]);
      if (!mark.length) return [];
      const out: { playerId: string; scope: string; place: number; coins: number }[] = [];
      const give = async (scope: 'global' | 'country', player: string, place: number) => {
        const prize = rankPrize(scope, place);
        if (!prize) return;
        await q.query('INSERT INTO parques.rank_results (week, scope, player, place, coins, gems) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING', [week, scope, player, place, prize.coins, prize.gems]);
        await this.updateIn(q, player, (p) => grantRankPrize(p, prize.coins, prize.gems));
        out.push({ playerId: player, scope, place, coins: prize.coins });
      };
      const global = await q.query<{ id: string }>('SELECT id FROM parques.accounts WHERE games > 0 ORDER BY rating DESC, wins DESC LIMIT 100');
      for (const [i, r] of global.entries()) await give('global', r.id, i + 1);
      const country = await q.query<{ id: string; place: number }>(
        'SELECT id, place FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY country ORDER BY rating DESC, wins DESC)::int AS place FROM parques.accounts WHERE games > 0) x WHERE place <= 50',
      );
      for (const r of country) await give('country', r.id, r.place);
      return out;
    });
  }

  /** Premios global/país de la semana pasada (`week`) y el de amigos de esta semana (`thisWeek`). */
  async rankRewards(playerId: string, week: string, thisWeek: string, friends: string[]): Promise<RankRewardsInfo> {
    const db = await this.db;
    const rows = await db.query<{ scope: string; week: string; place: number; coins: number; gems: number }>(
      "SELECT scope, week, place, coins, gems FROM parques.rank_results WHERE player = $2 AND ((week = $1 AND scope <> 'friends') OR (week = $3 AND scope = 'friends'))",
      [week, playerId, thisWeek],
    );
    const get = (s: string) => {
      const r = rows.find((x) => x.scope === s);
      return r ? { place: r.place, coins: r.coins, gems: r.gems } : null;
    };
    const fr = await this.friendsPlace(playerId, friends);
    const prize = fr ? rankPrize('friends', fr) : null;
    const f = get('friends');
    return {
      week,
      global: get('global'),
      country: get('country'),
      friends: f ? { ...f, claimed: true } : prize && fr ? { place: fr, ...prize, claimed: false } : null,
    };
  }

  /** Puesto entre tus amigos (cuenta solo si tienes al menos 3 amigos con partidas). */
  private async friendsPlace(playerId: string, friends: string[]): Promise<number | null> {
    const ids = [...new Set([playerId, ...friends.map(String)])].slice(0, 201);
    const rows = await (await this.db).query<{ id: string }>('SELECT id FROM parques.accounts WHERE id = ANY($1::text[]) AND games > 0 ORDER BY rating DESC, wins DESC', [ids]);
    if (rows.length < 4) return null;
    const i = rows.findIndex((r) => r.id === playerId);
    return i >= 0 ? i + 1 : null;
  }

  /** Premio semanal entre amigos (una vez por semana). */
  async claimFriendsPrize(playerId: string, week: string, friends: string[]): Promise<{ ok: boolean; error?: string; profile?: Profile; coins?: number; gems?: number; place?: number }> {
    const place = await this.friendsPlace(playerId, friends);
    const prize = place ? rankPrize('friends', place) : null;
    if (!place || !prize) return { ok: false, error: 'Necesitas quedar en el top 3 entre al menos 3 amigos que jueguen' };
    return (await this.db).tx(async (q) => {
      const ins = await q.query('INSERT INTO parques.rank_results (week, scope, player, place, coins, gems) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING player', [week, 'friends', playerId, place, prize.coins, prize.gems]);
      if (!ins.length) return { ok: false, error: 'Ya reclamaste el premio de esta semana' };
      const r = await this.updateIn(q, playerId, (p) => grantRankPrize(p, prize.coins, prize.gems));
      return { ok: true, profile: r.ok ? r.profile : undefined, coins: prize.coins, gems: prize.gems, place };
    });
  }
}

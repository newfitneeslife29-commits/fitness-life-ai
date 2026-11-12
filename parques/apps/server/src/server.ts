/**
 * Servidor online de Parqués: Socket.IO + emparejamiento + mesas privadas + ranking/torneos.
 * También sirve la app web compilada (apps/web/dist) si existe, para jugar todo desde un solo puerto.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { Server } from 'socket.io';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  addFriend,
  buyDeal,
  claimAd,
  claimEventTier,
  exchangeGems,
  openChest,
  tournamentTier,
  weekKey,
  applyMatch,
  buyWithCoins,
  claimDaily,
  claimMission,
  claimPass,
  equip,
  grantProduct,
  levelFromXp,
  payEntry,
  removeFriend,
  setIdentity,
  spendEmote,
  spin,
  summaryFor,
  table as tableOf,
  TOP_ROOM_SIZE,
} from '@parques/engine';
import type { ClientToServer, Hello, Profile, ProfileOp, ProfileOpResult, ServerToClient, TableId } from '@parques/engine';

/** Identidad verificada de Apple o Google. */
export interface VerifiedIdentity {
  sub: string;
  email: string | null;
}
export type IdentityVerifier = (provider: 'apple' | 'google', idToken: string) => Promise<VerifiedIdentity | null>;

const APPLE_KEYS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Verifica el token de identidad con las llaves públicas de Apple / Google. */
export const verifyIdentity: IdentityVerifier = async (provider, idToken) => {
  try {
    if (provider === 'apple') {
      const aud = (process.env.APPLE_CLIENT_IDS ?? 'parques.app').split(',').map((x) => x.trim()).filter(Boolean);
      const { payload } = await jwtVerify(idToken, APPLE_KEYS, { issuer: 'https://appleid.apple.com', audience: aud });
      return payload.sub ? { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : null } : null;
    }
    const aud = (process.env.GOOGLE_CLIENT_IDS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!aud.length) return null;
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: aud });
    return payload.sub ? { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : null } : null;
  } catch {
    return null;
  }
};
import { makeCode, Room, type Conn, type HumanResult, type Timing } from './room';
import { Store } from './store';
import { Payments, StorePurchases } from './payments';

interface SocketData {
  /** Id de la cuenta autenticada. */
  uid?: string;
}

export interface ServerOptions {
  port?: number;
  /** Postgres (Supabase) en producción. */
  databaseUrl?: string | null;
  /** Carpeta de PGlite para desarrollo; sin url ni carpeta = base en memoria (pruebas). */
  dataDir?: string | null;
  staticDir?: string | null;
  /** Espera máxima en la fila antes de completar la mesa con bots. */
  matchWaitMs?: number;
  timing?: Partial<Timing>;
  payments?: Payments;
  storePurchases?: StorePurchases;
  /** Verificación de Apple / Google (las pruebas la reemplazan). */
  verifyIdentity?: IdentityVerifier;
  /** Cada cuánto se revisan los cierres semanales (copas y ranking). */
  settleEveryMs?: number;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

type Req = import('node:http').IncomingMessage;
type Res = import('node:http').ServerResponse;

function sendJson(res: Res, code: number, data: unknown) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(data));
}

function readBody(req: Req): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const logErr = (e: unknown) => console.error('[parques]', e instanceof Error ? e.message : e);

/** Datos públicos del jugador que ven los demás en la mesa. */
function helloOf(p: Profile): Hello {
  return { playerId: p.id, name: p.name, avatar: p.photo ?? p.avatar, country: p.country, level: levelFromXp(p.xp).level };
}

/**
 * API HTTP:
 *  - POST /api/checkout {productId, playerId, returnUrl} → Stripe Checkout (web).
 *  - GET  /api/purchase/verify?session_id= → verifica el pago y lo acredita a la cuenta.
 *  - POST /api/iap/verify {id, token} → revisa compras de Google Play / App Store (RevenueCat) y las acredita.
 */
function apiHandler(payments: Payments, storePurchases: StorePurchases, store: Store, pushProfile: (id: string) => void) {
  const credit = async (playerId: string, productId: string, grantId: string, source: string): Promise<boolean> => {
    const ok = await store.creditPurchase(grantId, playerId, productId, source, (p) => grantProduct(p, productId, grantId));
    if (ok) pushProfile(playerId);
    return ok;
  };
  return async (req: Req, res: Res): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (!url.pathname.startsWith('/api/')) return false;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' });
      res.end();
      return true;
    }
    try {
      if (url.pathname === '/api/checkout' && req.method === 'POST') {
        const b = await readBody(req);
        const r = await payments.checkout(String(b.productId ?? ''), String(b.playerId ?? '').slice(0, 16), String(b.returnUrl ?? ''));
        sendJson(res, r.error ? 400 : 200, r);
        return true;
      }
      if (url.pathname === '/api/purchase/verify' && req.method === 'GET') {
        const r = await payments.verify(url.searchParams.get('session_id') ?? '');
        if (r.ok && r.grantId && r.playerId) await credit(r.playerId, r.productId!, r.grantId, 'stripe');
        sendJson(res, r.ok ? 200 : 400, { ok: r.ok, productId: r.productId, error: r.error, profile: r.playerId ? await store.getProfile(r.playerId) : undefined });
        return true;
      }
      if (url.pathname === '/api/iap/verify' && req.method === 'POST') {
        const b = await readBody(req);
        const id = String(b.id ?? '');
        if (!(await store.auth(id, String(b.token ?? '')))) {
          sendJson(res, 401, { ok: false, error: 'Cuenta no válida' });
          return true;
        }
        if (!storePurchases.enabled) {
          sendJson(res, 400, { ok: false, error: 'Compras de las tiendas no configuradas en el servidor' });
          return true;
        }
        const granted: string[] = [];
        for (const tx of await storePurchases.transactions(id)) if (await credit(id, tx.productId, tx.grantId, tx.store)) granted.push(tx.productId);
        sendJson(res, 200, { ok: true, granted, profile: await store.getProfile(id) });
        return true;
      }
      if (url.pathname === '/api/demo/grant' && req.method === 'POST') {
        // Compras de PRUEBA (sin cobro): solo si no hay pagos reales configurados y no se desactivaron.
        if (payments.enabled || process.env.PARQUES_DEMO_PURCHASES === 'off') {
          sendJson(res, 403, { ok: false, error: 'Compras de prueba desactivadas' });
          return true;
        }
        const b = await readBody(req);
        const id = String(b.id ?? '');
        if (!(await store.auth(id, String(b.token ?? '')))) {
          sendJson(res, 401, { ok: false, error: 'Cuenta no válida' });
          return true;
        }
        const ok = await credit(id, String(b.productId ?? ''), `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`, 'demo');
        sendJson(res, ok ? 200 : 400, { ok, error: ok ? undefined : 'No se pudo comprar', profile: await store.getProfile(id) });
        return true;
      }
      sendJson(res, 404, { error: 'No existe' });
    } catch {
      sendJson(res, 500, { error: 'Error del servidor de pagos' });
    }
    return true;
  };
}

function staticHandler(dir: string | null, api: (req: Req, res: Res) => Promise<boolean>, health: () => Promise<boolean>) {
  return async (req: Req, res: Res) => {
    if (await api(req, res)) return;
    if (req.url === '/health') {
      const ok = await health();
      res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok }));
      return;
    }
    if (!dir || !existsSync(dir)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Servidor de Parqués activo.');
      return;
    }
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
    let file = normalize(join(dir, url));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  };
}

export function startServer(opts: ServerOptions = {}): { http: HttpServer; io: Server; store: Store; close: () => Promise<void> } {
  const store = new Store({ url: opts.databaseUrl ?? null, dir: opts.dataDir ?? null });
  const payments = opts.payments ?? new Payments();
  const storePurchases = opts.storePurchases ?? new StorePurchases();
  const matchWait = opts.matchWaitMs ?? 10000;
  const verify = opts.verifyIdentity ?? verifyIdentity;

  const rooms = new Map<string, Room>();
  const byCode = new Map<string, Room>();
  const playerRoom = new Map<string, Room>();
  const sockets = new Map<string, string>(); // playerId → socket.id

  const emitTo = (playerId: string, event: string, ...args: unknown[]) => {
    const sid = sockets.get(playerId);
    if (sid) (io.to(sid).emit as (e: string, ...a: unknown[]) => void)(event, ...args);
  };
  const connFor = (playerId: string): Conn => ({ emit: (event, ...args) => emitTo(playerId, event, ...args) });
  const pushProfile = (id: string) => {
    store.getProfile(id).then((p) => p && emitTo(id, 'profile', p), logErr);
  };

  const http = createServer(staticHandler(opts.staticDir ?? null, apiHandler(payments, storePurchases, store, pushProfile), () => store.ready().then(() => true, () => false)));
  const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(http, { cors: { origin: '*' }, maxHttpBufferSize: 200_000 });

  /** Cobro de la entrada en la cuenta (lo llama la sala al empezar). */
  const charge = async (playerId: string, entry: number) => (await store.update(playerId, (p) => payEntry(p, entry))).ok;

  /** Al terminar: premios en la cuenta de cada humano y, si es online entre personas, ranking y torneo. */
  const settle = async (room: Room, results: HumanResult[]) => {
    const g = room.state;
    if (!g || !results.length) return;
    for (const r of results) {
      const summary = { ...summaryFor({ place: r.place, players: g.players.length, won: r.won, teams: !!g.rules.teams, stats: r.stats, mode: room.mode === 'online' ? 'online' : room.mode, table: room.table, entry: room.entry }), tournament: room.cup };
      const out = await store.update(r.playerId, (p) => applyMatch(p, summary));
      if (out.ok && 'outcome' in out) emitTo(r.playerId, 'match_result', { outcome: out.outcome, profile: out.profile });
    }
    if (room.mode === 'online') await store.recordMatch(results.map((r) => r.playerId));
    if (room.cup) await store.recordCup(room.cup, results.map((r) => r.playerId));
  };
  const onEnd = (room: Room, results: HumanResult[]) => {
    settle(room, results).catch(logErr);
    setTimeout(() => {
      room.destroy();
      rooms.delete(room.id);
      if (room.code) byCode.delete(room.code);
      for (const id of room.humans()) if (playerRoom.get(id) === room) playerRoom.delete(id);
    }, 60000).unref?.();
  };

  function newRoom(kind: 'quick' | 'private', seats: number, rules: Room['rules'], hostId: string | null, table: TableId | null = 'barrio', extra: Partial<ConstructorParameters<typeof Room>[0]> = {}): Room {
    let code: string | null = null;
    if (kind === 'private') {
      do code = makeCode();
      while (byCode.has(code));
    }
    const room = new Room({ kind, code, hostId, seats, rules, timing: opts.timing, onEnd, table, charge, ...extra });
    rooms.set(room.id, room);
    if (code) byCode.set(code, room);
    return room;
  }

  function leaveCurrent(playerId: string) {
    const r = playerRoom.get(playerId);
    if (!r) return;
    r.leave(playerId);
    playerRoom.delete(playerId);
  }

  /** ¿Puede entrar a esa mesa? (nivel, monedas y sala Top Leyendas). */
  async function eligible(p: Profile, t: TableId | null): Promise<string | null> {
    if (!t) return null;
    const tier = tableOf(t);
    if (!tier) return 'Mesa desconocida';
    if (levelFromXp(p.xp).level < tier.minLevel) return `Necesitas nivel ${tier.minLevel}`;
    if (tier.topOnly && (await store.rankOf(p.id)) > TOP_ROOM_SIZE) return `Solo para el top ${TOP_ROOM_SIZE} del ranking`;
    if (p.coins < tier.entry) return 'Te faltan monedas';
    return null;
  }

  // ------------------------------------------------ Emparejamiento por mesa
  interface Queue {
    ids: string[];
    timer: ReturnType<typeof setTimeout> | null;
    startsAt: number;
  }
  /** Filas: por mesa ("barrio"…) o por copa ("cup:bronce"…). */
  const queues = new Map<string, Queue>();
  const queueOf = (t: string): Queue => {
    let q = queues.get(t);
    if (!q) queues.set(t, (q = { ids: [], timer: null, startsAt: 0 }));
    return q;
  };
  const dequeue = (id: string) => {
    for (const q of queues.values()) {
      q.ids = q.ids.filter((x) => x !== id);
      if (!q.ids.length && q.timer) {
        clearTimeout(q.timer);
        q.timer = null;
      }
    }
  };

  async function launchQuick(t: string) {
    const q = queueOf(t);
    if (q.timer) clearTimeout(q.timer);
    q.timer = null;
    const group = q.ids.slice(0, 4);
    q.ids = q.ids.slice(4);
    if (!group.length) return;
    const cup = t.startsWith('cup:') ? t.slice(4) : null;
    const room = cup
      ? newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null, null, { mode: 'online', cup, botLevel: 'expert' })
      : newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null, t as TableId, { mode: 'online' });
    for (const id of group) {
      const p = await store.getProfile(id);
      if (!p) continue;
      room.addPlayer(helloOf(p), connFor(id));
      playerRoom.set(id, room);
    }
    room.start();
    if (q.ids.length) armQueue(t);
  }

  function armQueue(t: string) {
    const q = queueOf(t);
    if (q.ids.length >= 4) return void launchQuick(t).catch(logErr);
    if (!q.timer) {
      q.startsAt = Date.now() + matchWait;
      q.timer = setTimeout(() => void launchQuick(t).catch(logErr), matchWait);
    }
    for (const id of q.ids) connFor(id).emit('searching', { waiting: q.ids.length, startsInMs: Math.max(0, q.startsAt - Date.now()) });
  }

  // ------------------------------------------------ Operaciones de perfil
  async function runOp(uid: string, op: ProfileOp): Promise<ProfileOpResult> {
    const wrap = (r: { ok: boolean; error?: string; profile?: Profile } & Record<string, unknown>): ProfileOpResult => {
      if (!r.ok) return { ok: false, error: r.error };
      const { ok: _ok, profile, error: _e, ...result } = r;
      return { ok: true, profile, result };
    };
    switch (op?.op) {
      case 'get':
        return { ok: true, profile: (await store.getProfile(uid)) ?? undefined };
      case 'identity':
        return wrap(await store.update(uid, (p) => setIdentity(p, op.patch ?? {})));
      case 'buy':
        return wrap(await store.update(uid, (p) => buyWithCoins(p, String(op.itemId))));
      case 'equip':
        return wrap(await store.update(uid, (p) => equip(p, String(op.itemId))));
      case 'daily':
        return wrap(await store.update(uid, (p) => claimDaily(p)));
      case 'spin':
        return wrap(await store.update(uid, (p) => spin(p)));
      case 'mission':
        return wrap(await store.update(uid, (p) => claimMission(p, String(op.id))));
      case 'pass':
        return wrap(await store.update(uid, (p) => claimPass(p, Number(op.tier), op.track === 'premium' ? 'premium' : 'free')));
      case 'friend_add': {
        const f = await store.getProfile(String(op.friend?.id ?? '').toUpperCase());
        const friend = f ? { id: f.id, name: f.name, avatar: f.avatar } : { id: String(op.friend?.id ?? ''), name: String(op.friend?.name ?? ''), avatar: '🙂' };
        return wrap(await store.update(uid, (p) => addFriend(p, friend)));
      }
      case 'friend_remove':
        return wrap(await store.update(uid, (p) => removeFriend(p, String(op.id))));
      case 'emote': {
        const r = await store.update(uid, (p) => spendEmote(p, String(op.emoteId)));
        if (r.ok && 'glyph' in r) playerRoom.get(uid)?.chat(uid, String(r.glyph));
        return wrap(r);
      }
      case 'tournament_claim':
        return { ok: false, error: 'Los premios de los torneos ahora se entregan solos al cerrar la semana' };
      case 'ad':
        return wrap(await store.update(uid, (p) => claimAd(p)));
      case 'event_claim':
        return wrap(await store.update(uid, (p) => claimEventTier(p, Number(op.tier))));
      case 'deal':
        return wrap(await store.update(uid, (p) => buyDeal(p, String(op.itemId))));
      case 'chest':
        return wrap(await store.update(uid, (p) => openChest(p, String(op.chestId))));
      case 'exchange':
        return wrap(await store.update(uid, (p) => exchangeGems(p, Number(op.gems))));
      case 'cup_join': {
        const r = await store.joinCup(uid, String(op.tier));
        return r.ok ? { ok: true, profile: r.profile } : { ok: false, error: r.error };
      }
      case 'rank_friends_claim': {
        const me = await store.getProfile(uid);
        const r = await store.claimFriendsPrize(uid, weekKey(new Date()), me?.friends.map((f) => f.id) ?? []);
        return r.ok ? { ok: true, profile: r.profile, result: { coins: r.coins, gems: r.gems, place: r.place } } : { ok: false, error: r.error };
      }
      default:
        return { ok: false, error: 'Operación desconocida' };
    }
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.uid;
    const profileOf = async () => (me() ? await store.getProfile(me()!) : null);

    /** Entrar: con id+token existentes, o crear una cuenta nueva de invitado. */
    socket.on('auth', async (a, ack) => {
      let id: string | undefined;
      let token: string | undefined;
      let profile: Profile | null = null;
      if (a?.id && a?.token) {
        profile = await store.auth(String(a.id), String(a.token));
        if (!profile) return ack?.({ ok: false, error: 'Cuenta no válida' });
        id = profile.id;
      } else {
        const acc = await store.createAccount();
        ({ id, token, profile } = acc);
      }
      socket.data.uid = id;
      sockets.set(id!, socket.id);
      ack?.({ ok: true, id, token, profile: profile! });
    });

    socket.on('profile_op', async (op, ack) => {
      const uid = me();
      if (!uid) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      ack?.(await runOp(uid, op));
    });

    socket.on('play_ai', async (o, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const t: TableId | null = o?.table && tableOf(o.table) && !tableOf(o.table)!.onlineOnly ? o.table : null;
      const err = await eligible(p, t);
      if (err) return ack?.({ ok: false, error: err });
      leaveCurrent(p.id);
      dequeue(p.id);
      const players = ([2, 3, 4, 6] as const).includes(o?.players) ? o.players : 4;
      const teams = !!o?.teams && players === 4;
      const quick = !!o?.quick;
      const r = o?.rules ?? {};
      const room = newRoom(
        'quick',
        players,
        { soplar: r.soplar !== false, triplePairPenalty: r.triplePairPenalty !== false, jailAttempts: Number(r.jailAttempts) || 3, teams, piecesPerPlayer: quick ? 2 : 4 },
        null,
        t,
        { mode: quick ? 'quick' : teams ? 'teams' : 'ai', sides: players === 6 ? 6 : 4, botLevel: o?.level, timeLimitMs: quick ? 300000 : 0 },
      );
      room.addPlayer(helloOf(p), connFor(p.id));
      playerRoom.set(p.id, room);
      room.start();
      ack?.({ ok: true });
    });

    socket.on('quick_match', async (t, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const tier: TableId = tableOf(t) ? t : 'barrio';
      const err = await eligible(p, tier);
      if (err) return ack?.({ ok: false, error: err });
      leaveCurrent(p.id);
      dequeue(p.id);
      queueOf(tier).ids.push(p.id);
      ack?.({ ok: true });
      armQueue(tier);
    });

    socket.on('cancel_match', () => {
      const id = me();
      if (id) dequeue(id);
    });

    socket.on('create_private', async (o, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const tier: TableId = o?.table && tableOf(o.table) ? o.table : 'barrio';
      const err = await eligible(p, tier);
      if (err) return ack?.({ ok: false, error: err });
      leaveCurrent(p.id);
      const seats = Math.max(2, Math.min(4, Number(o?.seats) || 4));
      const r = o?.rules ?? {};
      const room = newRoom('private', seats, { soplar: r.soplar !== false, triplePairPenalty: r.triplePairPenalty !== false, jailAttempts: Number(r.jailAttempts) || 3, teams: !!r.teams }, p.id, tier, { mode: 'online' });
      room.addPlayer(helloOf(p), connFor(p.id));
      playerRoom.set(p.id, room);
      ack?.({ ok: true, code: room.code! });
    });

    socket.on('join_private', async (code, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const room = byCode.get(String(code).toUpperCase());
      if (!room) return ack?.({ ok: false, error: 'No existe una mesa con ese código' });
      const err = await eligible(p, room.table);
      if (err) return ack?.({ ok: false, error: err });
      if (playerRoom.get(p.id) !== room) leaveCurrent(p.id);
      const r = room.addPlayer(helloOf(p), connFor(p.id));
      if (typeof r === 'string') return ack?.({ ok: false, error: r });
      playerRoom.set(p.id, room);
      ack?.({ ok: true });
    });

    socket.on('start_private', (ack) => {
      const id = me();
      const room = id ? playerRoom.get(id) : undefined;
      if (!room || room.kind !== 'private') return ack?.({ ok: false, error: 'No estás en una mesa privada' });
      if (room.hostId !== id) return ack?.({ ok: false, error: 'Solo el anfitrión puede empezar' });
      room.start();
      ack?.({ ok: true });
    });

    socket.on('action', (a, ack) => {
      const id = me();
      const room = id ? playerRoom.get(id) : undefined;
      if (!room) return ack?.({ ok: false, error: 'No estás en una mesa' });
      ack?.(room.handleAction(id!, a));
    });

    socket.on('chat', (text) => {
      const id = me();
      if (id) playerRoom.get(id)?.chat(id, text);
    });

    socket.on('leave', () => {
      const id = me();
      if (id) leaveCurrent(id);
    });

    socket.on('resume', (roomId, ack) => {
      const id = me();
      const room = rooms.get(String(roomId));
      if (!id || !room || room.seatOf(id) < 0) return ack?.({ ok: false });
      playerRoom.set(id, room);
      ack?.({ ok: room.attach(id, connFor(id)) });
    });

    socket.on('ranking', async (q, ack) => {
      const friends = Array.isArray(q?.friends) ? q.friends.slice(0, 200).map(String) : [];
      ack?.(await store.ranking(q?.scope ?? 'global', q?.country, friends));
    });

    socket.on('tournament', async (ack) => ack?.(await store.tournament()));

    socket.on('cups', async (ack) => {
      const id = me();
      ack?.(id ? await store.cups(id) : []);
    });

    socket.on('cup_match', async (tierId, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const tier = tournamentTier(String(tierId));
      if (!tier || tier.fee === 0) return ack?.({ ok: false, error: 'Torneo desconocido' });
      const entry = await store.cupEntry(p.id, tier.id);
      if (!entry) return ack?.({ ok: false, error: 'Primero inscríbete en el torneo' });
      if (entry.games >= tier.maxGames) return ack?.({ ok: false, error: `Ya jugaste las ${tier.maxGames} partidas de esta semana` });
      leaveCurrent(p.id);
      dequeue(p.id);
      const key = `cup:${tier.id}`;
      queueOf(key).ids.push(p.id);
      ack?.({ ok: true });
      armQueue(key);
    });

    socket.on('hall_of_fame', async (ack) => ack?.(await store.hallOfFame()));

    socket.on('rank_rewards', async (ack) => {
      const p = await profileOf();
      if (!p) return;
      const now = new Date();
      ack?.(await store.rankRewards(p.id, weekKey(new Date(now.getTime() - 7 * 86400000)), weekKey(now), p.friends.map((f) => f.id)));
    });

    socket.on('find_player', async (id, ack) => {
      const r = await store.publicPlayer(String(id ?? ''));
      ack?.(r ? { ...r, online: sockets.has(r.id) } : null);
    });

    socket.on('friends_online', (ids, ack) => {
      ack?.((Array.isArray(ids) ? ids : []).slice(0, 200).map(String).filter((x) => sockets.has(x)));
    });

    socket.on('invite', async (o, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const to = String(o?.to ?? '');
      if (!sockets.has(to)) return ack?.({ ok: false, error: 'Tu amigo no está conectado' });
      emitTo(to, 'invited', { from: { id: p.id, name: p.name, avatar: p.photo ? '🙂' : p.avatar }, code: String(o?.code ?? '').slice(0, 8) });
      ack?.({ ok: true });
    });

    /** Apple / Google: entra a la cuenta vinculada, o vincula la cuenta actual para no perderla. */
    socket.on('auth_provider', async (o, ack) => {
      const provider = o?.provider === 'apple' ? 'apple' : o?.provider === 'google' ? 'google' : null;
      if (!provider) return ack?.({ ok: false, error: 'Proveedor desconocido' });
      const ident = await verify(provider, String(o?.idToken ?? ''));
      if (!ident) return ack?.({ ok: false, error: 'No se pudo verificar la cuenta' });
      const existing = await store.accountFor(provider, ident.sub);
      const current = me();
      let id: string;
      let token: string | undefined;
      let linked = false;
      if (existing) {
        // Ya está vinculada: entra a esa cuenta (también en un celular nuevo).
        id = existing;
        if (existing !== current) token = await store.newSession(existing);
      } else if (current && o?.link) {
        id = current;
        linked = await store.linkIdentity(provider, ident.sub, current, ident.email);
      } else {
        const acc = await store.createAccount();
        id = acc.id;
        token = acc.token;
        linked = await store.linkIdentity(provider, ident.sub, acc.id, ident.email);
        if (o?.name) await store.update(id, (p) => setIdentity(p, { name: String(o.name) }));
      }
      const r = await store.update(id, (p) => ({ ok: true, profile: p.linked.includes(provider) ? p : { ...p, linked: [...p.linked, provider] } }));
      if (current && current !== id && sockets.get(current) === socket.id) sockets.delete(current);
      socket.data.uid = id;
      sockets.set(id, socket.id);
      ack?.({ ok: true, id, token, profile: r.ok ? r.profile : undefined, linked });
    });

    socket.on('disconnect', () => {
      const id = me();
      if (!id || sockets.get(id) !== socket.id) return;
      sockets.delete(id);
      dequeue(id);
      playerRoom.get(id)?.detach(id);
    });
  });

  // Cierres semanales: copas y premios del ranking de la semana pasada (una sola vez, en cualquier réplica).
  const settleWeek = async () => {
    const last = weekKey(new Date(Date.now() - 7 * 86400000));
    const cups = await store.settleCups(last);
    const ranks = await store.settleRanking(last);
    for (const c of cups) {
      pushProfile(c.playerId);
      emitTo(c.playerId, 'notice', { text: `🏆 Torneo: quedaste ${c.place}º y ganaste ${c.coins} monedas` });
    }
    for (const r of ranks) pushProfile(r.playerId);
  };
  const settleTimer = setInterval(() => void settleWeek().catch(logErr), opts.settleEveryMs ?? 10 * 60000);
  settleTimer.unref?.();
  void store.ready().then(settleWeek).catch(logErr);

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const r of rooms.values()) {
      if (now - r.lastActivity > 30 * 60000) {
        r.destroy();
        rooms.delete(r.id);
        if (r.code) byCode.delete(r.code);
      }
    }
  }, 60000);
  sweep.unref?.();

  if (opts.port !== undefined) http.listen(opts.port);

  return {
    http,
    io,
    store,
    close: () =>
      new Promise((resolve) => {
        clearInterval(sweep);
        clearInterval(settleTimer);
        for (const q of queues.values()) if (q.timer) clearTimeout(q.timer);
        for (const r of rooms.values()) r.destroy();
        io.close(() => {
          store.close().then(() => resolve(), () => resolve());
        });
      }),
  };
}

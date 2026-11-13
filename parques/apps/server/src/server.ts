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
  advanceStory,
  blockPlayer,
  FLASH,
  grantReward,
  recordAbandon,
  unblockPlayer,
  claimChallenge,
  claimWinChest,
  dailyChallenge,
  dayKey,
  doubleLastWin,
  saveStreak,
  STORY,
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
import type { ClientToServer, FlashBracket, HouseRules, Hello, Profile, ProfileOp, ProfileOpResult, ServerToClient, TableId } from '@parques/engine';
import { Social } from './social';
import { adminRoute } from './admin';

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
import { makeCode, Room, type Conn, type HumanResult, type RoomOptions, type Timing } from './room';
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
  /** Torneo relámpago: espera de la fila y pausa antes de la final (pruebas). */
  flashWaitMs?: number;
  flashFinalDelayMs?: number;
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

  const social = new Social(store);
  const baseHandler = staticHandler(opts.staticDir ?? null, apiHandler(payments, storePurchases, store, pushProfile), () => store.ready().then(() => true, () => false));
  const http = createServer((req, res) => {
    void (async () => {
      const ctx = {
        store,
        social,
        online: () => sockets.size,
        rooms: () => rooms.size,
        broadcast: (text: string) => io.emit('notice', { text }),
        pushProfile,
        kick: (id: string) => {
          const sid = sockets.get(id);
          if (sid) io.sockets.sockets.get(sid)?.disconnect(true);
        },
      };
      if (await adminRoute(req, res, ctx)) return;
      // Enlace de invitación: /r/<ID> abre la app con el código de quien invita.
      const m = /^\/r\/([A-Za-z0-9]{4,16})\/?$/.exec((req.url ?? '').split('?')[0]!);
      if (m) {
        res.writeHead(302, { location: `/?ref=${m[1]!.toUpperCase()}` });
        res.end();
        return;
      }
      await baseHandler(req, res);
    })().catch((e) => {
      logErr(e);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(http, { cors: { origin: '*' }, maxHttpBufferSize: 200_000 });

  /** Cobro de la entrada en la cuenta (lo llama la sala al empezar). */
  const charge = async (playerId: string, entry: number) => (await store.update(playerId, (p) => payEntry(p, entry))).ok;

  /** Al terminar: premios en la cuenta de cada humano y, si es online entre personas, ranking y torneo. */
  const settle = async (room: Room, results: HumanResult[]) => {
    const g = room.state;
    if (!g || !results.length) return;
    for (const r of results) {
      const summary = { ...summaryFor({ place: r.place, players: g.players.length, won: r.won, teams: !!g.rules.teams, stats: r.stats, mode: room.mode === 'online' ? 'online' : room.mode, table: room.table, entry: room.entry }), tournament: room.cup, matchId: room.id };
      const out = await store.update(r.playerId, (p) => applyMatch(p, summary));
      // Reto del día / etapa de la Historia: premio extra solo si ganó.
      let special: { kind: string; coins: number; gems: number; itemIds?: string[]; stage?: number } | null = null;
      const sp = room.special;
      if (r.won && sp) {
        const ex = await store.update(r.playerId, (p) => (sp.kind === 'challenge' ? claimChallenge(p) : advanceStory(p, sp.stage)));
        if (ex.ok) special = { kind: sp.kind, coins: (ex as { coins: number }).coins, gems: (ex as { gems: number }).gems, itemIds: (ex as { itemIds?: string[] }).itemIds, stage: sp.kind === 'story' ? sp.stage : undefined };
      }
      if (out.ok && 'outcome' in out) {
        const prof = special ? ((await store.getProfile(r.playerId)) ?? out.profile) : out.profile;
        emitTo(r.playerId, 'match_result', { outcome: { ...out.outcome, special, matchId: room.id }, profile: prof });
      }
    }
    if (room.mode === 'online') {
      await store.recordMatch(results.map((r) => r.playerId));
      for (const r of results) if (r.won) await social.clubWin(r.playerId);
    }
    if (room.cup) await store.recordCup(room.cup, results.map((r) => r.playerId));
  };
  const onEnd = (room: Room, results: HumanResult[]) => {
    settle(room, results).catch(logErr);
    if (room.flash) flashRoomEnded(room);
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

  function leaveCurrent(playerId: string, abandon = false) {
    const r = playerRoom.get(playerId);
    if (!r) return;
    // Abandonar una partida online en juego cuenta para la sanción (3 en 24 h → un rato sin online).
    if (abandon && r.mode === 'online' && r.status === 'playing' && r.state && r.state.phase !== 'over' && !r.seats[r.seatOf(playerId)]?.left) {
      store.update(playerId, (p) => recordAbandon(p)).then((x) => x.ok && pushProfile(playerId), logErr);
    }
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

  /** Sanción por abandonos o suspensión del administrador. */
  async function blockedFromOnline(p: Profile): Promise<string | null> {
    const ban = await social.bannedUntil(p.id);
    if (ban) return 'Tu cuenta está suspendida';
    if (p.penaltyUntil > Date.now()) return `Abandonaste muchas partidas: espera ${Math.ceil((p.penaltyUntil - Date.now()) / 60000)} min para jugar online`;
    return null;
  }

  // ------------------------------------------------ Torneo relámpago (16 jugadores, 4 mesas → final)
  interface Flash {
    id: string;
    humans: Set<string>;
    semis: { room: Room | null; names: string[]; winner: string | null; winnerId: string | null }[];
    final: Room | null;
    finalNames: string[];
    ranking: string[];
    stage: FlashBracket['stage'];
  }
  const flashQ: Queue = { ids: [], timer: null, startsAt: 0 };
  const flashes = new Map<string, Flash>();
  const BOT_POOL = ['La Toña', 'Don Chucho', 'El Mono', 'Doña Rosa', 'Pacho', 'La Nena', 'Juancho', 'Mafe', 'El Profe', 'Chepe', 'La Mona', 'Tavo'];

  const flashBracket = (f: Flash, id: string): FlashBracket => {
    const semi = f.semis.find((x) => x.room?.seatOf(id) !== undefined && (x.room?.seatOf(id) ?? -1) >= 0);
    let me: FlashBracket['me'] = 'playing';
    if (f.stage === 'done') me = f.ranking[0] === id ? 'champion' : 'done';
    else if (f.final && f.final.seatOf(id) >= 0) me = 'final';
    else if (semi?.winner) me = semi.winnerId === id ? 'waiting' : 'out';
    return {
      id: f.id,
      stage: f.stage,
      semis: f.semis.map((x) => ({ names: x.names, winner: x.winner })),
      final: f.stage === 'semis' ? null : { names: f.finalNames, ranking: f.ranking.map((r) => f.final?.seats.find((s) => s.playerId === r)?.name ?? r) },
      me,
    };
  };
  const flashPush = (f: Flash) => {
    for (const id of f.humans) emitTo(id, 'flash', { bracket: flashBracket(f, id) });
  };

  function armFlash() {
    if (flashQ.ids.length >= FLASH.size) return void launchFlash().catch(logErr);
    if (!flashQ.timer && flashQ.ids.length) {
      flashQ.startsAt = Date.now() + (opts.flashWaitMs ?? FLASH.waitMs);
      flashQ.timer = setTimeout(() => void launchFlash().catch(logErr), opts.flashWaitMs ?? FLASH.waitMs);
    }
    for (const id of flashQ.ids) emitTo(id, 'flash', { waiting: flashQ.ids.length, startsInMs: Math.max(0, flashQ.startsAt - Date.now()) });
  }

  async function launchFlash() {
    if (flashQ.timer) clearTimeout(flashQ.timer);
    flashQ.timer = null;
    const group = flashQ.ids.slice(0, FLASH.size);
    flashQ.ids = flashQ.ids.slice(FLASH.size);
    if (!group.length) return;
    const f: Flash = { id: Math.random().toString(36).slice(2, 8), humans: new Set(group), semis: [], final: null, finalNames: [], ranking: [], stage: 'semis' };
    flashes.set(f.id, f);
    const bots = [...BOT_POOL].sort(() => Math.random() - 0.5);
    for (let t = 0; t < 4; t++) {
      const ids = group.slice(t * 4, t * 4 + 4);
      if (!ids.length) {
        const names = bots.splice(0, 4);
        f.semis.push({ room: null, names, winner: names[Math.floor(Math.random() * names.length)]!, winnerId: null });
        continue;
      }
      const room = newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null, 'ciudad', { mode: 'online', botLevel: 'expert', flash: { id: f.id, round: 'semi' } });
      for (const id of ids) {
        const p = await store.getProfile(id);
        if (!p) continue;
        room.addPlayer(helloOf(p), connFor(id));
        playerRoom.set(id, room);
      }
      f.semis.push({ room, names: [], winner: null, winnerId: null });
      await room.start();
      f.semis[t]!.names = room.seats.map((s) => s.name);
    }
    flashPush(f);
    maybeFinal(f);
    if (flashQ.ids.length) armFlash();
  }

  function flashRoomEnded(room: Room) {
    const f = flashes.get(room.flash!.id);
    if (!f) return;
    const g = room.state;
    if (room.flash!.round === 'semi') {
      const semi = f.semis.find((x) => x.room === room);
      if (!semi || semi.winner) return;
      const seat = g && g.phase === 'over' ? room.seats[g.ranking[0]!] : undefined;
      // Si todos los humanos se fueron, avanza un bot de esa mesa.
      const s = seat ?? room.seats.find((x) => x.kind === 'bot' && !x.left) ?? room.seats[0]!;
      semi.winner = s.name;
      semi.winnerId = s.playerId && !s.left && !s.replaced ? s.playerId : null;
      flashPush(f);
      maybeFinal(f);
      return;
    }
    // Final: premios por puesto a los humanos.
    f.stage = 'done';
    const order = g ? g.ranking.map((i) => room.seats[i]!) : [];
    f.ranking = order.map((s) => s.playerId ?? s.name);
    order.forEach((s, place) => {
      const prize = FLASH.prizes[place];
      if (!s.playerId || !prize) return;
      const id = s.playerId;
      store.update(id, (p) => grantReward(p, prize.coins, prize.gems)).then((x) => {
        if (!x.ok) return;
        pushProfile(id);
        emitTo(id, 'notice', { text: `⚡ Torneo relámpago: quedaste ${place + 1}º y ganaste ${prize.coins} monedas` });
      }, logErr);
    });
    flashPush(f);
    setTimeout(() => flashes.delete(f.id), 120000).unref?.();
  }

  function maybeFinal(f: Flash) {
    if (f.stage !== 'semis' || f.semis.some((x) => !x.winner)) return;
    f.stage = 'final';
    f.finalNames = f.semis.map((x) => x.winner!);
    const humans = f.semis.flatMap((x) => (x.winnerId ? [x.winnerId] : []));
    if (!humans.length) {
      f.stage = 'done';
      f.ranking = [...f.finalNames].sort(() => Math.random() - 0.5);
      flashPush(f);
      return;
    }
    flashPush(f);
    const botNames = f.semis.filter((x) => !x.winnerId).map((x) => x.winner!);
    const room = newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null, null, { mode: 'online', botLevel: 'expert', flash: { id: f.id, round: 'final' }, botNames });
    f.final = room;
    setTimeout(() => {
      void (async () => {
        for (const id of humans) {
          const p = await store.getProfile(id);
          if (!p) continue;
          room.addPlayer(helloOf(p), connFor(id));
          playerRoom.set(id, room);
          emitTo(id, 'notice', { text: '⚡ ¡Llegaste a la final del torneo relámpago!' });
        }
        await room.start();
        flashPush(f);
      })().catch(logErr);
    }, opts.flashFinalDelayMs ?? 6000).unref?.();
  }

  // ------------------------------------------------ 2 vs 2 online con un amigo
  const duoQ: { pairs: [string, string][]; timer: ReturnType<typeof setTimeout> | null; table: TableId } = { pairs: [], timer: null, table: 'barrio' };
  async function launchDuo() {
    if (duoQ.timer) clearTimeout(duoQ.timer);
    duoQ.timer = null;
    const [a, b] = duoQ.pairs.splice(0, 2);
    if (!a) return;
    const room = newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3, teams: true }, null, duoQ.table, { mode: 'online' });
    // Compañeros en lados opuestos: pareja A en las sillas 0 y 2, pareja B en 1 y 3.
    const seatsFor = [[0, 2], [1, 3]] as const;
    for (const [k, pair] of [a, b].entries()) {
      if (!pair) continue;
      for (const [j, id] of pair.entries()) {
        const p = await store.getProfile(id);
        if (!p) continue;
        room.addPlayer(helloOf(p), connFor(id), seatsFor[k]![j]);
        playerRoom.set(id, room);
      }
    }
    await room.start();
    if (duoQ.pairs.length) armDuo();
  }
  function armDuo() {
    if (duoQ.pairs.length >= 2) return void launchDuo().catch(logErr);
    if (!duoQ.timer && duoQ.pairs.length) duoQ.timer = setTimeout(() => void launchDuo().catch(logErr), opts.matchWaitMs ?? matchWait);
    for (const pair of duoQ.pairs) for (const id of pair) connFor(id).emit('searching', { waiting: duoQ.pairs.length * 2, startsInMs: opts.matchWaitMs ?? matchWait });
  }
  const dropDuo = (id: string) => {
    duoQ.pairs = duoQ.pairs.filter((p) => !p.includes(id));
    if (!duoQ.pairs.length && duoQ.timer) {
      clearTimeout(duoQ.timer);
      duoQ.timer = null;
    }
  };

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
      case 'win_chest':
        return wrap(await store.update(uid, (p) => claimWinChest(p)));
      case 'double_win':
        return wrap(await store.update(uid, (p) => doubleLastWin(p, String(op.matchId))));
      case 'save_streak':
        return wrap(await store.update(uid, (p) => saveStreak(p)));
      case 'block':
        return wrap(await store.update(uid, (p) => blockPlayer(p, String(op.id))));
      case 'unblock':
        return wrap(await store.update(uid, (p) => unblockPlayer(p, String(op.id))));
      case 'referral': {
        const r = await social.redeem(uid, String(op.code ?? ''));
        if (r.ok && r.referrer) {
          pushProfile(r.referrer);
          emitTo(r.referrer, 'notice', { text: '🎉 Un amigo entró con tu invitación: ¡ganaste monedas y gemas!' });
        }
        return r.ok ? { ok: true, profile: r.profile, result: { coins: r.coins } } : { ok: false, error: r.error };
      }
      case 'club_chest': {
        const r = await social.claimClubChest(uid, Number(op.tier));
        return r.ok ? { ok: true, profile: r.profile, result: { coins: r.coins, gems: r.gems } } : { ok: false, error: r.error };
      }
      case 'league_claim': {
        const r = await store.claimLeague(uid, weekKey(new Date()));
        return r.ok ? { ok: true, profile: r.profile, result: { coins: r.coins, gems: r.gems, division: r.division } } : { ok: false, error: r.error };
      }
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
      if (await social.bannedUntil(id!)) return ack?.({ ok: false, error: 'Tu cuenta está suspendida por reportes de la comunidad' });
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
      let r: Partial<HouseRules> = o?.rules ?? {};
      // Reto del día y Historia: reglas y rivales los decide el servidor.
      let special: RoomOptions['special'] | undefined;
      let boss: RoomOptions['boss'] | undefined;
      let level = o?.level;
      let nPlayers = players;
      if (o?.challenge) {
        const c = dailyChallenge(dayKey());
        if (p.challenge.day === dayKey() && p.challenge.done) return ack?.({ ok: false, error: 'Ya ganaste el reto de hoy' });
        r = { ...c.rules };
        nPlayers = c.players;
        special = { kind: 'challenge' };
      } else if (typeof o?.story === 'number') {
        const st = STORY[o.story];
        if (!st || o.story !== p.story) return ack?.({ ok: false, error: 'Primero supera las etapas anteriores' });
        r = { ...st.rules };
        nPlayers = st.players;
        level = st.level;
        special = { kind: 'story', stage: o.story };
        boss = { name: st.boss, avatar: st.bossAvatar };
      }
      const room = newRoom(
        'quick',
        nPlayers,
        {
          ...r,
          soplar: r.soplar !== false,
          triplePairPenalty: r.triplePairPenalty !== false,
          jailAttempts: Number(r.jailAttempts) || 3,
          teams,
          piecesPerPlayer: quick ? 2 : (r.piecesPerPlayer ?? 4),
        },
        null,
        special ? 'barrio' : t,
        { mode: quick ? 'quick' : teams ? 'teams' : 'ai', sides: nPlayers === 6 ? 6 : 4, botLevel: level, timeLimitMs: quick ? 300000 : 0, special, boss },
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
      const err = (await blockedFromOnline(p)) ?? (await eligible(p, tier));
      if (err) return ack?.({ ok: false, error: err });
      leaveCurrent(p.id);
      dequeue(p.id);
      queueOf(tier).ids.push(p.id);
      ack?.({ ok: true });
      armQueue(tier);
    });

    socket.on('cancel_match', () => {
      const id = me();
      if (id) {
        dequeue(id);
        dropDuo(id);
      }
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
      // En parejas, el primero que entra queda de compañero del anfitrión (lado opuesto).
      const prefer = room.rules.teams && room.humans().length === 1 ? 2 : undefined;
      const r = room.addPlayer(helloOf(p), connFor(p.id), prefer);
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
      if (id) leaveCurrent(id, true);
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

    socket.on('league', async (ack) => {
      const id = me();
      if (!id) return ack?.({ rating: 1000, games: 0, claimed: false });
      ack?.(await store.leagueInfo(id, weekKey(new Date())));
    });

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
      const target = await store.getProfile(to);
      if (target?.blocked.includes(p.id)) return ack?.({ ok: false, error: 'No puedes invitar a este jugador' });
      emitTo(to, 'invited', { from: { id: p.id, name: p.name, avatar: p.photo ? '🙂' : p.avatar }, code: String(o?.code ?? '').slice(0, 8) });
      ack?.({ ok: true });
    });

    // ------------------------------------------------ v1.2 social
    socket.on('report', async (o, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      ack?.(await social.report(id, String(o?.playerId ?? ''), String(o?.reason ?? '')));
    });

    socket.on('dm', async (o, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const r = await social.sendDm(p, String(o?.to ?? ''), String(o?.text ?? ''));
      if (r.ok && r.msg) emitTo(r.msg.to, 'dm', r.msg);
      ack?.(r);
    });

    socket.on('dm_history', async (withId, ack) => {
      const id = me();
      ack?.(id ? await social.dmHistory(id, String(withId ?? '')) : []);
    });

    socket.on('club_list', async (q, ack) => ack?.(await social.listClubs(String(q ?? ''))));
    socket.on('club_info', async (ack) => {
      const id = me();
      ack?.(id ? await social.clubInfo(id, (x) => sockets.has(x)) : null);
    });
    socket.on('club_create', async (o, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const r = await social.createClub(id, String(o?.name ?? ''), String(o?.emoji ?? ''));
      if (r.ok) pushProfile(id);
      ack?.(r);
    });
    socket.on('club_join', async (club, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      ack?.(await social.joinClub(id, String(club ?? '')));
    });
    socket.on('club_leave', async (ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      ack?.(await social.leaveClub(id));
    });
    socket.on('club_kick', async (player, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      ack?.(await social.kick(id, String(player ?? '')));
    });
    socket.on('club_chat', async (text, ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const r = await social.clubChat(p, String(text ?? ''));
      if (r.ok && r.club && r.msg) for (const m of await social.clubMembers(r.club)) emitTo(m, 'club_chat', r.msg);
      ack?.({ ok: r.ok, error: r.error });
    });

    socket.on('flash_join', async (ack) => {
      const p = await profileOf();
      if (!p) return ack?.({ ok: false, error: 'Primero inicia sesión' });
      const err = await blockedFromOnline(p);
      if (err) return ack?.({ ok: false, error: err });
      if (p.coins < FLASH.entry) return ack?.({ ok: false, error: 'Te faltan monedas' });
      leaveCurrent(p.id);
      dequeue(p.id);
      if (!flashQ.ids.includes(p.id)) flashQ.ids.push(p.id);
      ack?.({ ok: true });
      armFlash();
    });
    socket.on('flash_cancel', () => {
      const id = me();
      if (!id) return;
      flashQ.ids = flashQ.ids.filter((x) => x !== id);
      if (!flashQ.ids.length && flashQ.timer) {
        clearTimeout(flashQ.timer);
        flashQ.timer = null;
      }
    });

    socket.on('duo_match', async (ack) => {
      const id = me();
      const room = id ? playerRoom.get(id) : undefined;
      if (!id || !room || room.kind !== 'private' || room.status !== 'waiting') return ack?.({ ok: false, error: 'Primero crea una mesa privada en parejas' });
      if (room.hostId !== id) return ack?.({ ok: false, error: 'Solo el anfitrión puede buscar rivales' });
      if (!room.rules.teams) return ack?.({ ok: false, error: 'La mesa debe ser en parejas' });
      const pair = room.humans();
      if (pair.length !== 2) return ack?.({ ok: false, error: 'Espera a que entre tu compañero' });
      for (const x of pair) {
        const p = await store.getProfile(x);
        const err = p ? ((await blockedFromOnline(p)) ?? (await eligible(p, room.table))) : 'Cuenta no encontrada';
        if (err) return ack?.({ ok: false, error: p && x !== id ? `${p.name}: ${err}` : err });
      }
      // Se cierra la mesa privada y la pareja pasa a la fila de 2 vs 2.
      for (const x of pair) {
        room.leave(x);
        playerRoom.delete(x);
      }
      room.destroy();
      rooms.delete(room.id);
      if (room.code) byCode.delete(room.code);
      duoQ.table = room.table ?? 'barrio';
      duoQ.pairs.push([pair[0]!, pair[1]!]);
      ack?.({ ok: true });
      armDuo();
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
      dropDuo(id);
      flashQ.ids = flashQ.ids.filter((x) => x !== id);
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
        if (flashQ.timer) clearTimeout(flashQ.timer);
        if (duoQ.timer) clearTimeout(duoQ.timer);
        for (const r of rooms.values()) r.destroy();
        io.close(() => {
          store.close().then(() => resolve(), () => resolve());
        });
      }),
  };
}

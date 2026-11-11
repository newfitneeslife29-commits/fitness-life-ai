/**
 * Servidor online de Parqués: Socket.IO + emparejamiento + mesas privadas + ranking/torneos.
 * También sirve la app web compilada (apps/web/dist) si existe, para jugar todo desde un solo puerto.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { Server } from 'socket.io';
import { table as tableOf, TOP_ROOM_SIZE } from '@parques/engine';
import type { ClientToServer, Hello, ServerToClient, TableId } from '@parques/engine';
import { makeCode, Room, type Conn, type Timing } from './room';
import { Store } from './store';
import { Payments } from './payments';

interface SocketData {
  hello?: Hello;
}

export interface ServerOptions {
  port?: number;
  dataFile?: string | null;
  staticDir?: string | null;
  /** Espera máxima en la fila antes de completar la mesa con bots. */
  matchWaitMs?: number;
  timing?: Partial<Timing>;
  payments?: Payments;
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

/** API de pagos: /api/checkout (POST) y /api/purchase/verify?session_id= (GET). */
function apiHandler(payments: Payments, store: Store) {
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
        const id = url.searchParams.get('session_id') ?? '';
        const r = await payments.verify(id);
        if (r.ok && r.grantId) store.recordPurchase(r.grantId, r.playerId ?? '', r.productId!);
        sendJson(res, r.ok ? 200 : 400, r);
        return true;
      }
      sendJson(res, 404, { error: 'No existe' });
    } catch (e) {
      sendJson(res, 500, { error: 'Error del servidor de pagos' });
    }
    return true;
  };
}

function staticHandler(dir: string | null, api: (req: Req, res: Res) => Promise<boolean>) {
  return async (req: Req, res: Res) => {
    if (await api(req, res)) return;
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    if (!dir || !existsSync(dir)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Servidor de Parqués activo. Abre la app web para jugar.');
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
  const store = new Store(opts.dataFile ?? null);
  const payments = opts.payments ?? new Payments();
  const http = createServer(staticHandler(opts.staticDir ?? null, apiHandler(payments, store)));
  const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(http, { cors: { origin: '*' } });
  const matchWait = opts.matchWaitMs ?? 10000;

  const rooms = new Map<string, Room>();
  const byCode = new Map<string, Room>();
  const playerRoom = new Map<string, Room>();
  const sockets = new Map<string, string>(); // playerId → socket.id
  /** Una fila de emparejamiento por mesa. */
  interface Queue {
    ids: string[];
    timer: ReturnType<typeof setTimeout> | null;
    startsAt: number;
  }
  const queues = new Map<TableId, Queue>();
  const queueOf = (t: TableId): Queue => {
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

  /** ¿Puede este jugador entrar a esa mesa? (nivel mínimo y sala Top Leyendas). */
  function eligible(h: Hello, t: TableId): string | null {
    const tier = tableOf(t);
    if (!tier) return 'Mesa desconocida';
    if ((h.level ?? 1) < tier.minLevel) return `Necesitas nivel ${tier.minLevel}`;
    if (tier.topOnly && store.rankOf(h.playerId) > TOP_ROOM_SIZE) return `Solo para el top ${TOP_ROOM_SIZE} del ranking`;
    return null;
  }

  const connFor = (playerId: string): Conn => ({
    emit: (event, ...args) => {
      const sid = sockets.get(playerId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (sid) (io.to(sid).emit as (e: string, ...a: unknown[]) => void)(event, ...args);
    },
  });

  const onEnd = (room: Room, ranking: string[]) => {
    if (ranking.length) store.recordMatch(ranking);
    // La mesa se limpia un rato después para que los clientes vean el final.
    setTimeout(() => {
      room.destroy();
      rooms.delete(room.id);
      if (room.code) byCode.delete(room.code);
      for (const id of room.humans()) if (playerRoom.get(id) === room) playerRoom.delete(id);
    }, 60000).unref?.();
  };

  function newRoom(kind: 'quick' | 'private', seats: number, rules: Room['rules'], hostId: string | null, table: TableId = 'barrio'): Room {
    let code: string | null = null;
    if (kind === 'private') {
      do code = makeCode();
      while (byCode.has(code));
    }
    const room = new Room({ kind, code, hostId, seats, rules, timing: opts.timing, onEnd, table });
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

  function launchQuick(t: TableId) {
    const q = queueOf(t);
    if (q.timer) clearTimeout(q.timer);
    q.timer = null;
    const group = q.ids.slice(0, 4);
    q.ids = q.ids.slice(4);
    if (!group.length) return;
    const room = newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null, t);
    for (const id of group) {
      const h = io.sockets.sockets.get(sockets.get(id) ?? '')?.data.hello;
      if (!h) continue;
      room.addPlayer(h, connFor(id));
      playerRoom.set(id, room);
    }
    room.start();
    if (q.ids.length) armQueue(t);
  }

  function armQueue(t: TableId) {
    const q = queueOf(t);
    if (q.ids.length >= 4) return launchQuick(t);
    if (!q.timer) {
      q.startsAt = Date.now() + matchWait;
      q.timer = setTimeout(() => launchQuick(t), matchWait);
    }
    for (const id of q.ids) connFor(id).emit('searching', { waiting: q.ids.length, startsInMs: Math.max(0, q.startsAt - Date.now()) });
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.hello?.playerId;

    socket.on('hello', (h, ack) => {
      if (!h || typeof h.playerId !== 'string' || h.playerId.length < 4) return;
      // El avatar puede ser un emoji o una foto pequeña (data URL JPEG/PNG de hasta ~40 KB).
      const av = String(h.avatar ?? '🙂');
      const avatar = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(av) && av.length <= 40000 ? av : av.slice(0, 8);
      const hello: Hello = { playerId: h.playerId.slice(0, 16), name: String(h.name ?? 'Jugador').slice(0, 14), avatar, country: String(h.country ?? 'XX').slice(0, 2), level: Math.max(1, Math.min(2000, Number(h.level) || 1)) };
      socket.data.hello = hello;
      sockets.set(hello.playerId, socket.id);
      store.upsertPlayer(hello);
      ack?.({ ok: true });
    });

    socket.on('quick_match', (t, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      const tier: TableId = tableOf(t) ? t : 'barrio';
      const err = eligible(socket.data.hello!, tier);
      if (err) return ack?.({ ok: false, error: err });
      leaveCurrent(id);
      dequeue(id);
      queueOf(tier).ids.push(id);
      ack?.({ ok: true });
      armQueue(tier);
    });

    socket.on('cancel_match', () => {
      const id = me();
      if (id) dequeue(id);
    });

    socket.on('create_private', (o, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      leaveCurrent(id);
      const seats = Math.max(2, Math.min(4, Number(o?.seats) || 4));
      const r = o?.rules ?? {};
      const tier: TableId = o?.table && tableOf(o.table) ? o.table : 'barrio';
      const err = eligible(socket.data.hello!, tier);
      if (err) return ack?.({ ok: false, error: err });
      const room = newRoom('private', seats, { soplar: r.soplar !== false, triplePairPenalty: r.triplePairPenalty !== false, jailAttempts: Number(r.jailAttempts) || 3, teams: !!r.teams }, id, tier);
      room.addPlayer(socket.data.hello!, connFor(id));
      playerRoom.set(id, room);
      ack?.({ ok: true, code: room.code! });
    });

    socket.on('join_private', (code, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      const room = byCode.get(String(code).toUpperCase());
      if (!room) return ack?.({ ok: false, error: 'No existe una mesa con ese código' });
      const err = eligible(socket.data.hello!, room.table);
      if (err) return ack?.({ ok: false, error: err });
      if (playerRoom.get(id) !== room) leaveCurrent(id);
      const r = room.addPlayer(socket.data.hello!, connFor(id));
      if (typeof r === 'string') return ack?.({ ok: false, error: r });
      playerRoom.set(id, room);
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

    socket.on('ranking', (q, ack) => {
      const friends = Array.isArray(q?.friends) ? q.friends.slice(0, 200).map(String) : [];
      ack?.(store.ranking(q?.scope ?? 'global', q?.country, friends));
    });

    socket.on('tournament', (ack) => ack?.(store.tournament()));

    socket.on('tournament_claim', (ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      ack?.(store.claimLastWeek(id));
    });

    socket.on('disconnect', () => {
      const id = me();
      if (!id) return;
      // Solo cuenta si es la conexión vigente del jugador (pudo haber abierto otra).
      if (sockets.get(id) !== socket.id) return;
      sockets.delete(id);
      dequeue(id);
      playerRoom.get(id)?.detach(id);
    });
  });

  // Limpieza de mesas abandonadas.
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
        for (const q of queues.values()) if (q.timer) clearTimeout(q.timer);
        for (const r of rooms.values()) r.destroy();
        io.close(() => resolve());
      }),
  };
}

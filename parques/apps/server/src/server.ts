/**
 * Servidor online de Parqués: Socket.IO + emparejamiento + mesas privadas + ranking/torneos.
 * También sirve la app web compilada (apps/web/dist) si existe, para jugar todo desde un solo puerto.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { Server } from 'socket.io';
import type { ClientToServer, Hello, ServerToClient } from '@parques/engine';
import { makeCode, Room, type Conn, type Timing } from './room';
import { Store } from './store';

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

function staticHandler(dir: string | null) {
  return (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
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
  const http = createServer(staticHandler(opts.staticDir ?? null));
  const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(http, { cors: { origin: '*' } });
  const matchWait = opts.matchWaitMs ?? 10000;

  const rooms = new Map<string, Room>();
  const byCode = new Map<string, Room>();
  const playerRoom = new Map<string, Room>();
  const sockets = new Map<string, string>(); // playerId → socket.id
  let queue: string[] = [];
  let queueTimer: ReturnType<typeof setTimeout> | null = null;
  let queueStartsAt = 0;

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

  function newRoom(kind: 'quick' | 'private', seats: number, rules: Room['rules'], hostId: string | null): Room {
    let code: string | null = null;
    if (kind === 'private') {
      do code = makeCode();
      while (byCode.has(code));
    }
    const room = new Room({ kind, code, hostId, seats, rules, timing: opts.timing, onEnd });
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

  function launchQuick() {
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = null;
    const group = queue.slice(0, 4);
    queue = queue.slice(4);
    if (!group.length) return;
    const room = newRoom('quick', 4, { soplar: true, triplePairPenalty: true, jailAttempts: 3 }, null);
    for (const id of group) {
      const h = io.sockets.sockets.get(sockets.get(id) ?? '')?.data.hello;
      if (!h) continue;
      room.addPlayer(h, connFor(id));
      playerRoom.set(id, room);
    }
    room.start();
    if (queue.length) armQueue();
  }

  function armQueue() {
    if (queue.length >= 4) return launchQuick();
    if (!queueTimer) {
      queueStartsAt = Date.now() + matchWait;
      queueTimer = setTimeout(launchQuick, matchWait);
    }
    for (const id of queue) connFor(id).emit('searching', { waiting: queue.length, startsInMs: Math.max(0, queueStartsAt - Date.now()) });
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.hello?.playerId;

    socket.on('hello', (h, ack) => {
      if (!h || typeof h.playerId !== 'string' || h.playerId.length < 4) return;
      const hello: Hello = { playerId: h.playerId.slice(0, 16), name: String(h.name ?? 'Jugador').slice(0, 14), avatar: String(h.avatar ?? '🙂').slice(0, 8), country: String(h.country ?? 'XX').slice(0, 2) };
      socket.data.hello = hello;
      sockets.set(hello.playerId, socket.id);
      store.upsertPlayer(hello);
      ack?.({ ok: true });
    });

    socket.on('quick_match', (ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      leaveCurrent(id);
      if (!queue.includes(id)) queue.push(id);
      ack?.({ ok: true });
      armQueue();
    });

    socket.on('cancel_match', () => {
      const id = me();
      queue = queue.filter((x) => x !== id);
      if (!queue.length && queueTimer) {
        clearTimeout(queueTimer);
        queueTimer = null;
      }
    });

    socket.on('create_private', (o, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      leaveCurrent(id);
      const seats = Math.max(2, Math.min(4, Number(o?.seats) || 4));
      const r = o?.rules ?? {};
      const room = newRoom('private', seats, { soplar: r.soplar !== false, triplePairPenalty: r.triplePairPenalty !== false, jailAttempts: Number(r.jailAttempts) || 3, teams: !!r.teams }, id);
      room.addPlayer(socket.data.hello!, connFor(id));
      playerRoom.set(id, room);
      ack?.({ ok: true, code: room.code! });
    });

    socket.on('join_private', (code, ack) => {
      const id = me();
      if (!id) return ack?.({ ok: false, error: 'Primero saluda (hello)' });
      const room = byCode.get(String(code).toUpperCase());
      if (!room) return ack?.({ ok: false, error: 'No existe una mesa con ese código' });
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
      queue = queue.filter((x) => x !== id);
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
        if (queueTimer) clearTimeout(queueTimer);
        for (const r of rooms.values()) r.destroy();
        io.close(() => resolve());
      }),
  };
}

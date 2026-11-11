/**
 * Cliente online (Socket.IO). El servidor es la autoridad: aquí solo se envían intenciones
 * y se reciben estados/eventos para animar. Se reconecta solo y retoma la partida.
 */
import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { levelFromXp } from '@parques/engine';
import type { ClientToServer, HouseRules, RankRow, RoomInfo, ServerToClient, TableId, TournamentInfo, UpdateMsg } from '@parques/engine';
import { tr } from './i18n';
import { useGame, type MatchConfig } from '../stores/gameStore';
import { useApp } from '../stores/appStore';
import { useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useFx } from '../stores/fxStore';

type S = Socket<ServerToClient, ClientToServer>;

interface OnlineState {
  status: 'off' | 'connecting' | 'online' | 'error';
  error: string | null;
  room: RoomInfo | null;
  mySeat: number | null;
  searching: { waiting: number; startsAt: number } | null;
  connect: () => Promise<boolean>;
  quickMatch: (table: TableId) => Promise<void>;
  cancelMatch: () => void;
  createPrivate: (seats: number, rules: Partial<HouseRules>, table: TableId) => Promise<string | null>;
  joinPrivate: (code: string) => Promise<string | null>;
  startPrivate: () => Promise<string | null>;
  leaveRoom: () => void;
  ranking: (scope: 'global' | 'country' | 'friends') => Promise<RankRow[] | null>;
  tournament: () => Promise<TournamentInfo | null>;
  claimTournament: () => Promise<{ ok: boolean; coins?: number; gems?: number; place?: number; error?: string } | null>;
}

let socket: S | null = null;
let connecting: Promise<boolean> | null = null;
const ROOM_KEY = 'parques-room';

function serverUrl(): string | undefined {
  const url = useSettings.getState().serverUrl.trim();
  return url || undefined;
}

function remember(roomId: string | null) {
  try {
    if (roomId) sessionStorage.setItem(ROOM_KEY, roomId);
    else sessionStorage.removeItem(ROOM_KEY);
  } catch {
    /* ignorar */
  }
}
function remembered(): string | null {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

function configFrom(room: RoomInfo, mySeat: number): MatchConfig {
  return {
    sides: 4,
    mode: 'online',
    table: room.table,
    entry: room.entry,
    turnSeconds: 20,
    timeLimitSec: 0,
    rules: room.rules,
    seats: room.seats.map((s, i) => ({
      name: s.name,
      side: s.side,
      kind: i === mySeat ? 'human' : 'remote',
      level: 'normal',
      avatar: s.avatar,
    })),
  };
}

const link = {
  sendAction: (a: Parameters<ClientToServer['action']>[0]) =>
    socket?.emit('action', a, (r) => {
      if (!r.ok && r.error) useFx.getState().toast({ icon: '⚠️', title: r.error });
    }),
  sendChat: (text: string) => socket?.emit('chat', text),
  leave: () => {
    socket?.emit('leave');
    remember(null);
    useOnline.setState({ room: null, mySeat: null });
  },
};

/** Salas ya cobradas (para no cobrar dos veces al reconectar). */
const paidRooms = new Set<string>();

function enterGame(room: RoomInfo, mySeat: number, msg: UpdateMsg) {
  remember(room.roomId);
  if (!paidRooms.has(room.roomId)) {
    paidRooms.add(room.roomId);
    useProfile.getState().pay(room.entry);
  }
  useOnline.setState({ room, mySeat, searching: null });
  useGame.getState().startOnline(configFrom(room, mySeat), msg, link, mySeat);
  useApp.getState().go('game');
}

export const useOnline = create<OnlineState>((set, get) => ({
  status: 'off',
  error: null,
  room: null,
  mySeat: null,
  searching: null,

  connect: () => {
    if (socket?.connected && get().status === 'online') return Promise.resolve(true);
    if (connecting) return connecting;
    connecting = new Promise<boolean>((resolve) => {
      set({ status: 'connecting', error: null });
      socket?.removeAllListeners();
      socket?.disconnect();
      const s: S = io(serverUrl() ?? '/', { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000, timeout: 6000 });
      socket = s;
      let first = true;
      const hello = () => {
        const p = useProfile.getState();
        s.emit('hello', { playerId: p.id, name: p.name, avatar: p.photo ?? p.avatar, country: p.country, level: levelFromXp(p.xp).level }, () => {
          set({ status: 'online' });
          const roomId = remembered();
          if (roomId) s.emit('resume', roomId, (r) => r.ok || remember(null));
          if (first) {
            first = false;
            resolve(true);
          }
        });
      };
      s.on('connect', hello);
      s.on('connect_error', () => {
        set({ status: 'error', error: 'No se pudo conectar con el servidor' });
        if (first) {
          first = false;
          resolve(false);
        }
      });
      s.on('disconnect', () => set({ status: 'connecting' }));
      s.on('room', (room) => set({ room }));
      s.on('searching', (m) => set({ searching: { waiting: m.waiting, startsAt: Date.now() + m.startsInMs } }));
      s.on('match_found', (info) => set({ room: info, mySeat: info.mySeat }));
      s.on('sync', (msg) => {
        if (useGame.getState().online && useApp.getState().screen === 'game' && get().room?.roomId === msg.room.roomId) {
          // Reconexión: se reemplaza el estado sin animar.
          useGame.getState().startOnline(configFrom(msg.room, msg.mySeat), { ...msg, events: [] }, link, msg.mySeat);
          useOnline.setState({ room: msg.room, mySeat: msg.mySeat });
        } else enterGame(msg.room, msg.mySeat, msg);
      });
      s.on('update', (msg) => {
        useGame.getState().receive(msg);
        if (msg.state.phase === 'over') remember(null);
      });
      s.on('chat', (m) => useGame.getState().say(m.seat, m.text));
      s.on('notice', (m) => useFx.getState().toast({ icon: '📣', title: m.text }));
      setTimeout(() => {
        if (first) {
          first = false;
          set({ status: 'error', error: 'El servidor no responde' });
          resolve(false);
        }
      }, 7000);
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  },

  quickMatch: async (table) => {
    if (!(await get().connect())) return;
    set({ searching: { waiting: 1, startsAt: Date.now() + 10000 } });
    socket!.emit('quick_match', table, (r) => {
      if (!r.ok) set({ searching: null, error: r.error ?? 'No se pudo buscar partida' });
    });
  },

  cancelMatch: () => {
    socket?.emit('cancel_match');
    set({ searching: null });
  },

  createPrivate: async (seats, rules, table) => {
    if (!(await get().connect())) return get().error;
    return new Promise((resolve) =>
      socket!.emit('create_private', { seats, rules, table }, (r) => resolve(r.ok ? null : (r.error ?? tr('Error')))),
    );
  },

  joinPrivate: async (code) => {
    if (!(await get().connect())) return get().error;
    return new Promise((resolve) => socket!.emit('join_private', code.trim().toUpperCase(), (r) => resolve(r.ok ? null : (r.error ?? 'Error'))));
  },

  startPrivate: () => new Promise((resolve) => socket?.emit('start_private', (r) => resolve(r.ok ? null : (r.error ?? 'Error')))),

  leaveRoom: () => link.leave(),

  ranking: async (scope) => {
    if (!(await get().connect())) return null;
    const p = useProfile.getState();
    return new Promise((resolve) =>
      socket!.emit('ranking', { scope, country: p.country, friends: [p.id, ...p.friends.map((f) => f.id)] }, (rows) => resolve(rows)),
    );
  },

  tournament: async () => {
    if (!(await get().connect())) return null;
    return new Promise((resolve) => socket!.emit('tournament', (t) => resolve(t)));
  },

  claimTournament: async () => {
    if (!(await get().connect())) return null;
    return new Promise((resolve) => socket!.emit('tournament_claim', (r) => resolve(r)));
  },
}));

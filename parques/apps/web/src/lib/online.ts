/**
 * Cliente online (Socket.IO). El juego es online: el servidor guarda la cuenta (monedas,
 * gemas, compras, progreso) y juega todas las partidas con premio, también contra la máquina.
 * Aquí solo se envían intenciones y se reciben estados/eventos para animar.
 * Se reconecta solo y retoma la partida.
 */
import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, HouseRules, PlayAiOpts, RankRow, RoomInfo, ServerToClient, TableId, TournamentInfo, UpdateMsg } from '@parques/engine';
import { tr } from './i18n';
import { useGame, type MatchConfig } from '../stores/gameStore';
import { useApp } from '../stores/appStore';
import { setProfileSender, useProfile } from '../stores/profileStore';
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
  playAi: (o: PlayAiOpts) => Promise<string | null>;
  /** Repite la última partida contra la máquina. */
  rematchAi: () => Promise<string | null>;
  quickMatch: (table: TableId) => Promise<void>;
  cancelMatch: () => void;
  createPrivate: (seats: number, rules: Partial<HouseRules>, table: TableId) => Promise<string | null>;
  joinPrivate: (code: string) => Promise<string | null>;
  startPrivate: () => Promise<string | null>;
  leaveRoom: () => void;
  ranking: (scope: 'global' | 'country' | 'friends') => Promise<RankRow[] | null>;
  tournament: () => Promise<TournamentInfo | null>;
  /** Entrar con otra cuenta (código de recuperación). */
  restore: (id: string, token: string) => Promise<string | null>;
}

let socket: S | null = null;
let connecting: Promise<boolean> | null = null;
let lastAi: PlayAiOpts | null = null;
const ROOM_KEY = 'parques-room';
const SESSION_KEY = 'parques-session';

/** Servidor: el de Ajustes, o el de la compilación (apps móviles: VITE_SERVER_URL), o el mismo origen. */
export function serverUrl(): string {
  const fromSettings = useSettings.getState().serverUrl.trim();
  const fromBuild = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';
  return (fromSettings || fromBuild).replace(/\/$/, '');
}

export interface Session {
  id: string;
  token: string;
}

export function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
    return s?.id && s?.token ? s : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
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
    sides: room.sides,
    mode: room.mode === 'online' ? 'online' : room.mode,
    table: room.table,
    entry: room.entry,
    turnSeconds: 20,
    timeLimitSec: 0,
    rules: room.rules,
    seats: room.seats.map((s, i) => ({
      name: s.name,
      side: s.side,
      kind: i === mySeat ? 'human' : s.kind === 'bot' ? 'bot' : 'remote',
      level: 'normal',
      avatar: s.avatar,
    })),
  };
}

/** Primera conexión desde que se abrió la app. */
let freshLaunch = true;

const link = {
  sendAction: (a: Parameters<ClientToServer['action']>[0]) =>
    socket?.emit('action', a, (r) => {
      if (!r.ok && r.error) useFx.getState().toast({ icon: '⚠️', title: tr(r.error) });
    }),
  sendChat: (text: string) => socket?.emit('chat', text),
  leave: () => {
    socket?.emit('leave');
    remember(null);
    useOnline.setState({ room: null, mySeat: null });
  },
};

function enterGame(room: RoomInfo, mySeat: number, msg: UpdateMsg) {
  remember(room.roomId);
  useOnline.setState({ room, mySeat, searching: null });
  useGame.getState().startOnline(configFrom(room, mySeat), msg, link, mySeat, room.endsAt);
  useApp.getState().go('game');
}

const ack = <T>(fn: (cb: (r: T) => void) => void, ms = 8000): Promise<T | null> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    fn((r) => {
      clearTimeout(t);
      resolve(r);
    });
  });

setProfileSender(async (op) => {
  if (!(await useOnline.getState().connect())) return { ok: false, error: 'Sin conexión' };
  return (await ack((cb) => socket!.emit('profile_op', op, cb))) ?? { ok: false, error: 'El servidor no responde' };
});

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
      const url = serverUrl();
      const s: S = io(url || '/', { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000, timeout: 6000 });
      socket = s;
      let first = true;
      const done = (ok: boolean) => {
        if (!first) return;
        first = false;
        resolve(ok);
      };
      const login = () => {
        s.emit('auth', getSession() ?? {}, (r) => {
          if (!r.ok) {
            // La cuenta guardada ya no existe en este servidor: se crea una nueva.
            saveSession(null);
            s.emit('auth', {}, (r2) => {
              if (r2.ok && r2.id && r2.token) saveSession({ id: r2.id, token: r2.token });
              if (r2.profile) useProfile.getState().setFromServer(r2.profile);
              set({ status: 'online' });
              done(true);
            });
            return;
          }
          if (r.token && r.id) saveSession({ id: r.id, token: r.token });
          if (r.profile) useProfile.getState().setFromServer(r.profile);
          set({ status: 'online' });
          const roomId = remembered();
          if (roomId && freshLaunch) {
            // Se cerró la app en plena partida = abandono: se sale de la mesa (la máquina juega por ti) y se queda en el inicio.
            s.emit('leave');
            remember(null);
          } else if (roomId) {
            // Corte de conexión con la app abierta: se vuelve a la misma partida.
            s.emit('resume', roomId, (x) => {
              if (x.ok) return;
              remember(null);
              if (useApp.getState().screen === 'game' && useGame.getState().online) {
                useGame.getState().quit();
                useApp.getState().go('lobby');
              }
            });
          }
          freshLaunch = false;
          done(true);
        });
      };
      s.on('connect', login);
      s.on('connect_error', () => {
        set({ status: 'error', error: 'No se pudo conectar con el servidor' });
        done(false);
      });
      s.on('disconnect', () => set({ status: 'connecting' }));
      s.on('room', (room) => set({ room }));
      s.on('searching', (m) => set({ searching: { waiting: m.waiting, startsAt: Date.now() + m.startsInMs } }));
      s.on('match_found', (info) => set({ room: info, mySeat: info.mySeat }));
      s.on('sync', (msg) => {
        if (useGame.getState().online && useApp.getState().screen === 'game' && get().room?.roomId === msg.room.roomId) {
          // Reconexión: se reemplaza el estado sin animar.
          useGame.getState().startOnline(configFrom(msg.room, msg.mySeat), { ...msg, events: [] }, link, msg.mySeat, msg.room.endsAt);
          useOnline.setState({ room: msg.room, mySeat: msg.mySeat });
        } else enterGame(msg.room, msg.mySeat, msg);
      });
      s.on('update', (msg) => {
        useGame.getState().receive(msg);
        if (msg.state.phase === 'over') remember(null);
      });
      s.on('profile', (p) => useProfile.getState().setFromServer(p));
      s.on('match_result', (r) => {
        useProfile.getState().setFromServer(r.profile);
        useGame.getState().setOutcome(r.outcome);
      });
      s.on('chat', (m) => useGame.getState().say(m.seat, m.text));
      s.on('notice', (m) => useFx.getState().toast({ icon: '📣', title: tr(m.text) }));
      setTimeout(() => {
        if (first) {
          set({ status: 'error', error: 'El servidor no responde' });
          done(false);
        }
      }, 8000);
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  },

  playAi: async (o) => {
    lastAi = o;
    if (!(await get().connect())) return get().error ?? 'Sin conexión';
    const r = await ack<{ ok: boolean; error?: string }>((cb) => socket!.emit('play_ai', o, cb));
    return r?.ok ? null : (r?.error ?? 'El servidor no responde');
  },

  rematchAi: () => (lastAi ? get().playAi(lastAi) : Promise.resolve('Error')),

  quickMatch: async (table) => {
    if (!(await get().connect())) return;
    set({ searching: { waiting: 1, startsAt: Date.now() + 10000 }, error: null });
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
    const r = await ack<{ ok: boolean; error?: string }>((cb) => socket!.emit('create_private', { seats, rules, table }, cb));
    return r?.ok ? null : (r?.error ?? 'Error');
  },

  joinPrivate: async (code) => {
    if (!(await get().connect())) return get().error;
    const r = await ack<{ ok: boolean; error?: string }>((cb) => socket!.emit('join_private', code.trim().toUpperCase(), cb));
    return r?.ok ? null : (r?.error ?? 'Error');
  },

  startPrivate: async () => {
    const r = await ack<{ ok: boolean; error?: string }>((cb) => socket?.emit('start_private', cb));
    return r?.ok ? null : (r?.error ?? 'Error');
  },

  leaveRoom: () => link.leave(),

  ranking: async (scope) => {
    if (!(await get().connect())) return null;
    const p = useProfile.getState();
    return ack((cb) => socket!.emit('ranking', { scope, country: p.country, friends: [p.id, ...p.friends.map((f) => f.id)] }, cb));
  },

  tournament: async () => {
    if (!(await get().connect())) return null;
    return ack((cb) => socket!.emit('tournament', cb));
  },

  restore: async (id, token) => {
    if (!(await get().connect())) return get().error ?? 'Sin conexión';
    const r = await ack<{ ok: boolean; error?: string; profile?: import('@parques/engine').Profile }>((cb) => socket!.emit('auth', { id: id.trim().toUpperCase(), token: token.trim() }, cb));
    if (!r?.ok || !r.profile) return r?.error ?? 'Cuenta no válida';
    saveSession({ id: r.profile.id, token: token.trim() });
    useProfile.getState().setFromServer(r.profile);
    return null;
  },
}));

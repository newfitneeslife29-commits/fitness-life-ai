import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLatest } from './hooks';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import * as Haptics from 'expo-haptics';
import { API_ORIGIN, syncClock } from './api';
import { useAuth } from './auth';
import type { AppNotification, AuctionLive } from './types';

interface RealtimeContextValue {
  socket: Socket | null;
  connected: boolean;
  /** Ref-counted room membership, so two screens can watch the same auction. */
  joinAuction(id: string): void;
  leaveAuction(id: string): void;
  toast: AppNotification | null;
  dismissToast(): void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  socket: null,
  connected: false,
  joinAuction: () => {},
  leaveAuction: () => {},
  toast: null,
  dismissToast: () => {},
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, setUnread } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const rooms = useRef(new Map<string, number>());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io(API_ORIGIN, { auth: { token }, transports: ['websocket'], reconnectionDelayMax: 5000 });
    socketRef.current = s;
    s.on('connect', () => {
      setConnected(true);
      // Rooms are lost on reconnect; join them again.
      for (const auctionId of rooms.current.keys()) s.emit('auction:join', auctionId);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('hello', (msg: { serverTime: number }) => syncClock(msg.serverTime));
    s.on('notification', (n: AppNotification) => {
      setUnread((count) => count + 1);
      setToast(n);
      void Haptics.notificationAsync(
        n.type === 'outbid' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      );
    });
    setSocket(s);

    // Reconnect promptly when the app comes back to the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !s.connected) s.connect();
    });
    return () => {
      sub.remove();
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [token, setUnread]);

  const joinAuction = useCallback((auctionId: string) => {
    const count = rooms.current.get(auctionId) ?? 0;
    rooms.current.set(auctionId, count + 1);
    if (count === 0) socketRef.current?.emit('auction:join', auctionId);
  }, []);

  const leaveAuction = useCallback((auctionId: string) => {
    const count = rooms.current.get(auctionId) ?? 0;
    if (count <= 1) {
      rooms.current.delete(auctionId);
      socketRef.current?.emit('auction:leave', auctionId);
    } else {
      rooms.current.set(auctionId, count - 1);
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{ socket, connected, joinAuction, leaveAuction, toast, dismissToast: () => setToast(null) }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

/**
 * Subscribes to live updates for one auction. `onUpdate` receives each update
 * in order (stale/out-of-order messages are dropped by seq); `onResync` fires
 * after a reconnect so the screen can refetch anything it may have missed.
 */
export function useAuctionLive(
  auctionId: string | undefined,
  onUpdate: (live: AuctionLive) => void,
  onResync?: () => void,
  onQuestions?: () => void,
) {
  const { socket, joinAuction, leaveAuction } = useRealtime();
  const handlers = useLatest({ onUpdate, onResync, onQuestions });
  const lastSeq = useRef(-1);

  useEffect(() => {
    if (!socket || !auctionId) return;
    const handleUpdate = (live: AuctionLive & { serverTime?: number }) => {
      if (live.auctionId !== auctionId || live.seq <= lastSeq.current) return;
      lastSeq.current = live.seq;
      if (live.serverTime) syncClock(live.serverTime);
      handlers.current.onUpdate(live);
    };
    const handleReconnect = () => handlers.current.onResync?.();
    const handleQuestions = () => handlers.current.onQuestions?.();
    joinAuction(auctionId);
    socket.on('auction:update', handleUpdate);
    socket.on('auction:questions', handleQuestions);
    socket.io.on('reconnect', handleReconnect);
    return () => {
      leaveAuction(auctionId);
      socket.off('auction:update', handleUpdate);
      socket.off('auction:questions', handleQuestions);
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket, auctionId, joinAuction, leaveAuction, handlers]);

  /** Call with the seq from a REST fetch so older socket messages are ignored. */
  const setBaseline = useCallback((seq: number) => {
    lastSeq.current = Math.max(lastSeq.current, seq);
  }, []);
  return { setBaseline };
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useRealtime();
  const ref = useLatest(handler);
  useEffect(() => {
    if (!socket) return;
    const fn = (payload: T) => ref.current(payload);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [socket, event, ref]);
}

/** Keeps the socket subscribed to every auction in `ids` (e.g. visible list items). */
export function useWatchAuctions(ids: string[]) {
  const { socket, joinAuction, leaveAuction } = useRealtime();
  const key = ids.join(',');
  useEffect(() => {
    if (!socket || !key) return;
    const list = key.split(',');
    list.forEach(joinAuction);
    return () => list.forEach(leaveAuction);
  }, [socket, key, joinAuction, leaveAuction]);
}

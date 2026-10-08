import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage, serverNow } from './api';

/** Ticks every `intervalMs` using the server-synchronised clock. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Ref that always holds the latest value, for use inside stable callbacks. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload(): Promise<void>;
  refresh(): Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * Minimal data loader: fetches when `deps` change and whenever the screen
 * regains focus, with pull-to-refresh. Keeps stale data visible while
 * refetching and ignores responses that arrive after a newer request.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = [], { refetchOnFocus = true } = {}): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRef = useLatest(fetcher);
  const requestId = useRef(0);
  const firstFocus = useRef(true);
  const key = JSON.stringify(deps);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const result = await fetchRef.current();
      if (current !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (current !== requestId.current) return;
      setError(errorMessage(err));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [fetchRef]);

  useEffect(() => {
    void reload();
  }, [key, reload]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (refetchOnFocus) void reload();
    }, [reload, refetchOnFocus]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return { data, error, loading, refreshing, reload, refresh, setData };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { Me } from './types';

const TOKEN_KEY = 'subastia.token';

interface AuthContextValue {
  ready: boolean;
  user: Me | null;
  token: string | null;
  login(email: string, password: string): Promise<void>;
  register(input: { email: string; password: string; displayName: string; city?: string }): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  setUnread(updater: (n: number) => number): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const applySession = useCallback(async (newToken: string | null, newUser: Me | null) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    if (newToken) await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  const logout = useCallback(() => applySession(null, null), [applySession]);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setAuthToken(stored);
          const me = await api.get<Me>('/me');
          setToken(stored);
          setUser(me);
        }
      } catch {
        // A 401 already cleared the session via the unauthorized handler; on a
        // network error the stored token stays for the next launch.
        setAuthToken(null);
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      token,
      async login(email, password) {
        const res = await api.post<{ token: string; user: Me }>('/auth/login', { email, password });
        await applySession(res.token, res.user);
      },
      async register(input) {
        const res = await api.post<{ token: string; user: Me }>('/auth/register', input);
        await applySession(res.token, res.user);
      },
      logout,
      async refresh() {
        if (!token) return;
        setUser(await api.get<Me>('/me'));
      },
      setUnread(updater) {
        setUser((u) => (u ? { ...u, unreadNotifications: Math.max(0, updater(u.unreadNotifications)) } : u));
      },
    }),
    [ready, user, token, applySession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

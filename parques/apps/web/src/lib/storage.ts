import { createJSONStorage } from 'zustand/middleware';

/** localStorage a prueba de fallos (modo privado, almacenamiento bloqueado). */
const memory = new Map<string, string>();
export const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k) ?? memory.get(k) ?? null;
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    memory.set(k, v);
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignorar */
    }
  },
  removeItem: (k: string) => {
    memory.delete(k);
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignorar */
    }
  },
}));

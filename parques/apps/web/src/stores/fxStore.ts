/** Efectos globales de interfaz: monedas que vuelan al contador y avisos (toasts). */
import { create } from 'zustand';

export interface Flyer {
  id: number;
  kind: 'coin' | 'gem' | 'xp';
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
}

export interface Toast {
  id: number;
  icon: string;
  title: string;
  sub?: string;
}

interface FxState {
  flyers: Flyer[];
  toasts: Toast[];
  /** Hace volar `count` monedas/gemas desde un punto hasta su contador. */
  fly: (kind: Flyer['kind'], from: { x: number; y: number }, count?: number) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
}

let uid = 1;

export function targetOf(kind: Flyer['kind']): { x: number; y: number } {
  const el = document.querySelector(`[data-fly-target="${kind}"]`);
  if (!el) return { x: window.innerWidth - 60, y: 30 };
  const r = el.getBoundingClientRect();
  return { x: r.left + 18, y: r.top + r.height / 2 };
}

export function centerOf(el: Element | null): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export const useFx = create<FxState>((set) => ({
  flyers: [],
  toasts: [],
  fly: (kind, from, count = 8) => {
    const to = targetOf(kind);
    const items: Flyer[] = Array.from({ length: count }, (_, i) => ({
      id: uid++,
      kind,
      from: { x: from.x + (Math.random() - 0.5) * 60, y: from.y + (Math.random() - 0.5) * 40 },
      to,
      delay: i * 0.06,
    }));
    set((s) => ({ flyers: [...s.flyers, ...items] }));
    setTimeout(() => set((s) => ({ flyers: s.flyers.filter((f) => !items.includes(f)) })), 1600 + count * 60);
  },
  toast: (t) => {
    const toast = { ...t, id: uid++ };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== toast.id) })), 3200);
  },
}));

import type { AuctionStatus, Condition, OrderStatus } from './types';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function money(cents: number, currency = 'EUR') {
  if (currency === 'EUR') return eur.format(cents / 100);
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100);
}

/** "12,50" / "12.5" / "12" → 1250. Returns null when not a valid amount. */
export function parseMoney(input: string): number | null {
  const clean = input.trim().replace(/\s|€/g, '');
  if (!clean) return null;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');
}

export function bidIncrement(price: number) {
  const table: [number, number][] = [
    [100, 5], [500, 25], [2_500, 50], [10_000, 100], [25_000, 250],
    [50_000, 500], [100_000, 1_000], [250_000, 2_500], [500_000, 5_000],
  ];
  for (const [limit, inc] of table) if (price < limit) return inc;
  return 10_000;
}

export interface Remaining {
  ended: boolean;
  urgent: boolean;
  label: string;
  short: string;
}

export function remaining(endAt: number, now: number): Remaining {
  const ms = endAt - now;
  if (ms <= 0) return { ended: true, urgent: false, label: 'Finalizada', short: 'Finalizada' };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const urgent = ms < 60 * 60 * 1000;
  if (d > 0) return { ended: false, urgent, label: `${d} d ${h} h ${m} min`, short: `${d}d ${h}h` };
  if (h > 0) return { ended: false, urgent, label: `${h} h ${pad(m)} min ${pad(sec)} s`, short: `${h}h ${pad(m)}m` };
  return { ended: false, urgent, label: `${pad(m)}:${pad(sec)}`, short: `${pad(m)}:${pad(sec)}` };
}

export function relativeTime(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(ts: number) {
  return new Date(ts).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'Nuevo',
  like_new: 'Como nuevo',
  good: 'Buen estado',
  fair: 'Aceptable',
  for_parts: 'Para piezas',
};

export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  scheduled: 'Programada',
  active: 'Activa',
  sold: 'Vendida',
  no_bids: 'Sin pujas',
  reserve_not_met: 'Reserva no alcanzada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Pendiente de pago',
  paid: 'Pagado · pendiente de envío',
  shipped: 'Enviado',
  completed: 'Completado',
  unpaid: 'Impagado',
  disputed: 'En disputa',
  refunded: 'Reembolsado',
};

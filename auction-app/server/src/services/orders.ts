import { config } from '../config.ts';
import { getDb, id, type Row } from '../db.ts';
import { badRequest, conflict, forbidden, notFound } from '../errors.ts';
import { notify } from '../notifications.ts';
import { emitToUser } from '../realtime.ts';
import { formatEur } from './auctions.ts';
import { payments } from './payments.ts';
import { orderView } from './serialize.ts';

const db = () => getDb();

function getOrder(orderId: string): Row {
  const row = db().get('SELECT * FROM orders WHERE id = ?', orderId);
  if (!row) throw notFound('Pedido no encontrado');
  return row;
}

function auctionTitle(auctionId: string): string {
  return db().get('SELECT title FROM auctions WHERE id = ?', auctionId)?.title ?? 'tu artículo';
}

export function getOrderFor(userId: string, orderId: string) {
  const order = getOrder(orderId);
  if (order.buyer_id !== userId && order.seller_id !== userId) throw forbidden('No tienes acceso a este pedido');
  return order;
}

/** Double-entry ledger: every transaction's entries must sum to zero. */
function postLedger(orderId: string, currency: string, memo: string, entries: Array<[account: string, amount: number]>) {
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (total !== 0) throw new Error(`Ledger transaction does not balance (${total})`);
  const txId = id();
  const now = Date.now();
  for (const [account, amount] of entries) {
    if (amount === 0) continue;
    db().run(
      'INSERT INTO ledger_entries (id, tx_id, order_id, account, amount, currency, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id(), txId, orderId, account, amount, currency, memo, now,
    );
  }
}

function pushOrder(order: Row) {
  const view = orderView(order);
  emitToUser(order.buyer_id, 'order:update', view);
  emitToUser(order.seller_id, 'order:update', view);
}

export interface PayInput {
  cardNumber: string;
  expiry: string;
  cvc: string;
  shippingAddress: string;
}

const paymentsInFlight = new Set<string>();

export async function payOrder(userId: string, orderId: string, input: PayInput) {
  // The charge is async, so guard against a double tap charging twice.
  if (paymentsInFlight.has(orderId)) throw conflict('Ya estamos procesando este pago', 'PAYMENT_IN_PROGRESS');
  paymentsInFlight.add(orderId);
  try {
    return await chargeOrder(userId, orderId, input);
  } finally {
    paymentsInFlight.delete(orderId);
  }
}

async function chargeOrder(userId: string, orderId: string, input: PayInput) {
  const order = getOrder(orderId);
  if (order.buyer_id !== userId) throw forbidden('Solo el comprador puede pagar');
  if (order.status !== 'awaiting_payment') throw conflict('Este pedido no está pendiente de pago', 'INVALID_STATE');
  if (Date.now() > order.payment_due_at) throw conflict('El plazo de pago ha vencido', 'PAYMENT_EXPIRED');
  const address = String(input.shippingAddress ?? '').trim();
  if (address.length < 10) throw badRequest('Indica una dirección de envío completa');

  const result = await payments().charge({
    orderId,
    amount: order.total,
    currency: order.currency,
    cardNumber: String(input.cardNumber ?? ''),
    expiry: String(input.expiry ?? ''),
    cvc: String(input.cvc ?? ''),
  });
  if (!result.ok) throw conflict(result.message, result.code);

  const updated = db().transaction(() => {
    // Re-check: the scheduler may have expired it while we were charging.
    const fresh = getOrder(orderId);
    if (fresh.status !== 'awaiting_payment') throw conflict('Este pedido ya no está pendiente de pago', 'INVALID_STATE');
    db().run(
      "UPDATE orders SET status = 'paid', payment_ref = ?, card_last4 = ?, shipping_address = ?, paid_at = ? WHERE id = ?",
      result.reference, result.last4, address, Date.now(), orderId,
    );
    // Funds sit in escrow until delivery; buyer fee + VAT are recognised now.
    postLedger(orderId, order.currency, 'Pago del comprador', [
      ['buyer', -order.total],
      ['escrow', order.hammer_price + order.shipping_cost],
      ['platform_revenue', order.buyer_fee],
      ['tax_payable', order.tax],
    ]);
    db().audit(userId, 'order.paid', 'order', orderId, { reference: result.reference });
    return getOrder(orderId);
  });

  const title = auctionTitle(order.auction_id);
  notify(order.seller_id, {
    type: 'payment_received',
    title: 'Pago recibido',
    body: `El comprador ha pagado «${title}». Envíalo en los próximos 3 días hábiles.`,
    auctionId: order.auction_id,
    orderId,
  });
  pushOrder(updated);
  return updated;
}

export function shipOrder(userId: string, orderId: string, carrier: string, trackingNumber: string) {
  const order = getOrder(orderId);
  if (order.seller_id !== userId) throw forbidden('Solo el vendedor puede registrar el envío');
  if (order.status !== 'paid') throw conflict('El pedido debe estar pagado para enviarlo', 'INVALID_STATE');
  const c = String(carrier ?? '').trim();
  const t = String(trackingNumber ?? '').trim();
  if (c.length < 2 || t.length < 4) throw badRequest('Indica transportista y número de seguimiento');
  db().run(
    "UPDATE orders SET status = 'shipped', carrier = ?, tracking_number = ?, shipped_at = ? WHERE id = ?",
    c, t, Date.now(), orderId,
  );
  const updated = getOrder(orderId);
  notify(order.buyer_id, {
    type: 'shipped',
    title: '¡Tu artículo está en camino!',
    body: `«${auctionTitle(order.auction_id)}» se ha enviado con ${c} (${t}).`,
    auctionId: order.auction_id,
    orderId,
  });
  pushOrder(updated);
  return updated;
}

async function completeOrder(order: Row, actorId: string | null) {
  const payout = await payments().payout(order.seller_id, order.seller_payout, order.currency);
  db().transaction(() => {
    db().run("UPDATE orders SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'shipped'", Date.now(), order.id);
    postLedger(order.id, order.currency, `Liquidación al vendedor ${payout.reference}`, [
      ['escrow', -(order.hammer_price + order.shipping_cost)],
      ['seller', order.seller_payout],
      ['platform_revenue', order.seller_fee],
    ]);
    db().run('UPDATE users SET sales_count = sales_count + 1 WHERE id = ?', order.seller_id);
    db().run('UPDATE users SET purchases_count = purchases_count + 1 WHERE id = ?', order.buyer_id);
    db().audit(actorId, 'order.completed', 'order', order.id, { payout: payout.reference });
  });
  const updated = getOrder(order.id);
  notify(order.seller_id, {
    type: 'completed',
    title: 'Venta completada',
    body: `Hemos liberado ${formatEur(order.seller_payout)} por «${auctionTitle(order.auction_id)}».`,
    auctionId: order.auction_id,
    orderId: order.id,
  });
  pushOrder(updated);
  return updated;
}

export async function confirmDelivery(userId: string, orderId: string) {
  const order = getOrder(orderId);
  if (order.buyer_id !== userId) throw forbidden('Solo el comprador puede confirmar la recepción');
  if (order.status !== 'shipped') throw conflict('El pedido no está en camino', 'INVALID_STATE');
  return completeOrder(order, userId);
}

export function openDispute(userId: string, orderId: string, reason: string) {
  const order = getOrder(orderId);
  if (order.buyer_id !== userId) throw forbidden('Solo el comprador puede abrir una incidencia');
  if (!['paid', 'shipped'].includes(order.status)) throw conflict('No se puede abrir una incidencia en este estado', 'INVALID_STATE');
  const text = String(reason ?? '').trim();
  if (text.length < 10) throw badRequest('Describe el problema (mínimo 10 caracteres)');
  db().run("UPDATE orders SET status = 'disputed', dispute_reason = ? WHERE id = ?", text, orderId);
  db().audit(userId, 'order.disputed', 'order', orderId, { reason: text });
  const updated = getOrder(orderId);
  notify(order.seller_id, {
    type: 'dispute',
    title: 'Incidencia abierta',
    body: `El comprador ha abierto una incidencia: ${text}. El equipo de soporte mediará.`,
    auctionId: order.auction_id,
    orderId,
  });
  pushOrder(updated);
  return updated;
}

export function reviewOrder(userId: string, orderId: string, rating: number, comment?: string) {
  const order = getOrderFor(userId, orderId);
  if (order.status !== 'completed') throw conflict('Solo puedes valorar pedidos completados', 'INVALID_STATE');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('La valoración debe ser de 1 a 5');
  const targetId = userId === order.buyer_id ? order.seller_id : order.buyer_id;
  if (db().get('SELECT 1 AS x FROM reviews WHERE order_id = ? AND author_id = ?', orderId, userId)) {
    throw conflict('Ya has valorado este pedido', 'ALREADY_REVIEWED');
  }
  db().transaction(() => {
    db().run(
      'INSERT INTO reviews (id, order_id, author_id, target_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id(), orderId, userId, targetId, rating, comment?.trim() || null, Date.now(),
    );
    db().run('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?', rating, targetId);
  });
  notify(targetId, { type: 'review', title: 'Nueva valoración', body: `Te han valorado con ${rating} ★`, orderId });
  return { ok: true };
}

export function hasReviewed(userId: string, orderId: string) {
  return !!db().get('SELECT 1 AS x FROM reviews WHERE order_id = ? AND author_id = ?', orderId, userId);
}

/** Payment reminders, unpaid strikes and auto-completion. Driven by the scheduler. */
export async function tickOrders(now = Date.now()) {
  const dueSoon = db().all(
    `SELECT o.* FROM orders o WHERE o.status = 'awaiting_payment' AND o.payment_due_at - ? BETWEEN 0 AND ?
     AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.order_id = o.id AND n.type = 'payment_reminder')`,
    now, 6 * 3600 * 1000,
  );
  for (const order of dueSoon) {
    notify(order.buyer_id, {
      type: 'payment_reminder',
      title: 'Recuerda completar el pago',
      body: `Te quedan menos de 6 horas para pagar «${auctionTitle(order.auction_id)}».`,
      auctionId: order.auction_id,
      orderId: order.id,
    });
  }

  const expired = db().all("SELECT * FROM orders WHERE status = 'awaiting_payment' AND payment_due_at < ?", now);
  for (const order of expired) {
    db().transaction(() => {
      db().run("UPDATE orders SET status = 'unpaid' WHERE id = ? AND status = 'awaiting_payment'", order.id);
      db().run('UPDATE users SET unpaid_strikes = unpaid_strikes + 1 WHERE id = ?', order.buyer_id);
      db().audit(null, 'order.unpaid', 'order', order.id);
    });
    const title = auctionTitle(order.auction_id);
    notify(order.buyer_id, {
      type: 'unpaid',
      title: 'Pedido cancelado por impago',
      body: `No completaste el pago de «${title}». Esto afecta a tu reputación.`,
      orderId: order.id,
    });
    notify(order.seller_id, {
      type: 'unpaid',
      title: 'El comprador no ha pagado',
      body: `«${title}» no se pagó a tiempo. Puedes volver a publicarlo.`,
      auctionId: order.auction_id,
      orderId: order.id,
    });
    pushOrder(getOrder(order.id));
  }

  const toComplete = db().all("SELECT * FROM orders WHERE status = 'shipped' AND shipped_at < ?", now - config.autoCompleteMs);
  for (const order of toComplete) await completeOrder(order, null);
}

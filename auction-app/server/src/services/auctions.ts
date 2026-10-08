import { config } from '../config.ts';
import { getDb, id, type Row } from '../db.ts';
import { closeOutcome, placeMaxBid, type AuctionState } from '../engine.ts';
import { badRequest, conflict, forbidden, notFound } from '../errors.ts';
import { computeOrder } from '../money.ts';
import { notify } from '../notifications.ts';
import { emitToAuction } from '../realtime.ts';
import { auctionLive, buyNowAvailable, maskName } from './serialize.ts';
import { containsContactDetails, moderateListing } from './moderation.ts';

const db = () => getDb();

export function getAuctionRow(auctionId: string): Row {
  const row = db().get('SELECT * FROM auctions WHERE id = ?', auctionId);
  if (!row) throw notFound('La subasta no existe');
  return row;
}

function loadState(row: Row): AuctionState {
  const maxBids = db()
    .all('SELECT bidder_id, max_amount, updated_at FROM max_bids WHERE auction_id = ?', row.id)
    .map((m) => ({ bidderId: m.bidder_id as string, max: m.max_amount as number, at: m.updated_at as number }));
  return {
    startingPrice: row.starting_price,
    reservePrice: row.reserve_price,
    currentPrice: row.current_price,
    leaderId: row.leader_id,
    endAt: row.end_at,
    maxBids,
  };
}

function broadcast(row: Row) {
  emitToAuction(row.id, 'auction:update', auctionLive(row));
}

// ---------------------------------------------------------------- create

export interface CreateAuctionInput {
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  images: string[];
  location?: string;
  startingPrice: number;
  reservePrice?: number | null;
  buyNowPrice?: number | null;
  shippingCost: number;
  durationDays: number;
  startAt?: number;
}

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'for_parts'];

export function createAuction(sellerId: string, input: CreateAuctionInput) {
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (title.length < 5 || title.length > 80) throw badRequest('El título debe tener entre 5 y 80 caracteres');
  if (description.length < 20) throw badRequest('La descripción debe tener al menos 20 caracteres');
  if (!db().get('SELECT id FROM categories WHERE id = ?', input.categoryId)) throw badRequest('Categoría no válida');
  if (!CONDITIONS.includes(input.condition)) throw badRequest('Estado del artículo no válido');
  if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > 10) {
    throw badRequest('Añade entre 1 y 10 fotos');
  }
  const isCents = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  if (!isCents(input.startingPrice) || input.startingPrice < 100) throw badRequest('El precio de salida mínimo es 1,00 €');
  if (!isCents(input.shippingCost)) throw badRequest('Coste de envío no válido');
  const reserve = input.reservePrice ?? null;
  const buyNow = input.buyNowPrice ?? null;
  if (reserve !== null && (!isCents(reserve) || reserve <= input.startingPrice)) {
    throw badRequest('El precio de reserva debe ser mayor que el de salida');
  }
  if (buyNow !== null && (!isCents(buyNow) || buyNow <= Math.max(input.startingPrice, reserve ?? 0))) {
    throw badRequest('El precio de compra inmediata debe superar el de salida y el de reserva');
  }
  if (!(config.allowedDurationsDays as readonly number[]).includes(input.durationDays)) {
    throw badRequest(`Duración no válida (${config.allowedDurationsDays.join(', ')} días)`);
  }

  const now = Date.now();
  const startAt = input.startAt && input.startAt > now ? input.startAt : now;
  const endAt = startAt + input.durationDays * 24 * 3600 * 1000;
  const rejection = moderateListing(title, description);
  const status = rejection ? 'rejected' : startAt > now ? 'scheduled' : 'active';
  const auctionId = id();

  db().transaction(() => {
    db().run(
      `INSERT INTO auctions (id, seller_id, category_id, title, description, condition, images, location, currency,
        starting_price, reserve_price, buy_now_price, shipping_cost, current_price, start_at, end_at, original_end_at,
        status, rejection_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      auctionId, sellerId, input.categoryId, title, description, input.condition, JSON.stringify(input.images),
      input.location?.trim() || null, config.currency, input.startingPrice, reserve, buyNow, input.shippingCost,
      input.startingPrice, startAt, endAt, endAt, status, rejection, now,
    );
    db().audit(sellerId, 'auction.created', 'auction', auctionId, { status });
  });

  if (rejection) {
    notify(sellerId, { type: 'rejected', title: 'Anuncio rechazado', body: rejection, auctionId });
  }
  return getAuctionRow(auctionId);
}

export function cancelAuction(userId: string, auctionId: string) {
  const row = getAuctionRow(auctionId);
  if (row.seller_id !== userId) throw forbidden('Solo el vendedor puede cancelar');
  if (!['active', 'scheduled'].includes(row.status)) throw conflict('La subasta ya no se puede cancelar', 'INVALID_STATE');
  if (row.bid_count > 0) throw conflict('No puedes cancelar una subasta con pujas', 'HAS_BIDS');
  db().transaction(() => {
    db().run("UPDATE auctions SET status = 'cancelled', seq = seq + 1 WHERE id = ?", auctionId);
    db().audit(userId, 'auction.cancelled', 'auction', auctionId);
  });
  const updated = getAuctionRow(auctionId);
  broadcast(updated);
  return updated;
}

// ---------------------------------------------------------------- list

export interface ListQuery {
  q?: string;
  category?: string;
  sort?: string;
  status?: string;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

export function listAuctions(query: ListQuery) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  const status = query.status ?? 'active';
  if (status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  if (query.category) {
    where.push('category_id = ?');
    params.push(query.category);
  }
  if (query.sellerId) {
    where.push('seller_id = ?');
    params.push(query.sellerId);
  }
  if (query.q?.trim()) {
    for (const term of query.q.trim().split(/\s+/).slice(0, 5)) {
      where.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${term}%`, `%${term}%`);
    }
  }
  const orderBy: Record<string, string> = {
    ending_soon: 'end_at ASC',
    newest: 'created_at DESC',
    price_asc: 'current_price ASC',
    price_desc: 'current_price DESC',
    most_bids: 'bid_count DESC, end_at ASC',
    popular: 'watch_count DESC, bid_count DESC',
  };
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
  const offset = Math.max(query.offset ?? 0, 0);
  const sql = `SELECT * FROM auctions ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy[query.sort ?? 'ending_soon'] ?? orderBy.ending_soon} LIMIT ? OFFSET ?`;
  return db().all(sql, ...params, limit + 1, offset);
}

export function recentBids(auctionId: string, limit = 20) {
  return db()
    .all(
      `SELECT b.amount, b.is_proxy, b.created_at, u.display_name FROM bids b JOIN users u ON u.id = b.bidder_id
       WHERE b.auction_id = ? ORDER BY b.created_at DESC, b.amount DESC LIMIT ?`,
      auctionId, limit,
    )
    .map((b) => ({ bidder: maskName(b.display_name), amount: b.amount, isProxy: !!b.is_proxy, createdAt: b.created_at }));
}

export function countView(auctionId: string) {
  db().run('UPDATE auctions SET view_count = view_count + 1 WHERE id = ?', auctionId);
}

// ---------------------------------------------------------------- bidding

const recentBidTimes = new Map<string, number[]>();

function checkRateLimit(userId: string, now: number) {
  const { max, windowMs } = config.bidRateLimit;
  const times = (recentBidTimes.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= max) throw conflict('Demasiadas pujas seguidas. Espera unos segundos.', 'RATE_LIMITED');
  times.push(now);
  recentBidTimes.set(userId, times);
}

export function placeBid(userId: string, auctionId: string, amount: number, idempotencyKey?: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw badRequest('Importe no válido');

  if (idempotencyKey) {
    const previous = db().get('SELECT response FROM idempotency_keys WHERE user_id = ? AND key = ?', userId, idempotencyKey);
    if (previous) return JSON.parse(previous.response);
  }

  const now = Date.now();
  checkRateLimit(userId, now);

  const outcome = db().transaction(() => {
    const row = getAuctionRow(auctionId);
    if (row.status !== 'active' || now >= row.end_at) throw conflict('La subasta ha terminado', 'AUCTION_ENDED');
    if (row.seller_id === userId) throw forbidden('No puedes pujar en tu propia subasta', 'SELLER_CANNOT_BID');
    const user = db().get('SELECT unpaid_strikes FROM users WHERE id = ?', userId);
    if (user && user.unpaid_strikes >= config.maxUnpaidStrikes) {
      throw forbidden('Tienes demasiadas subastas impagadas para seguir pujando', 'TOO_MANY_STRIKES');
    }

    const result = placeMaxBid(loadState(row), userId, amount, now, config.antiSnipingMs);
    if (!result.ok) {
      const message =
        result.error === 'MAX_NOT_HIGHER'
          ? 'Ya vas ganando. Para subir tu máximo, indica un importe mayor.'
          : 'La puja es inferior a la mínima permitida';
      throw conflict(message, result.error, { minNextBid: result.minNextBid });
    }

    db().run(
      `INSERT INTO max_bids (auction_id, bidder_id, max_amount, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (auction_id, bidder_id) DO UPDATE SET max_amount = excluded.max_amount, updated_at = excluded.updated_at`,
      auctionId, userId, amount, now,
    );
    result.bids.forEach((bid, i) => {
      db().run(
        'INSERT INTO bids (id, auction_id, bidder_id, amount, is_proxy, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        id(), auctionId, bid.bidderId, bid.amount, bid.isProxy ? 1 : 0, now + i,
      );
    });
    const { state } = result;
    db().run(
      'UPDATE auctions SET current_price = ?, leader_id = ?, end_at = ?, bid_count = bid_count + ?, seq = seq + 1 WHERE id = ?',
      state.currentPrice, state.leaderId, state.endAt, result.bids.length, auctionId,
    );
    db().audit(userId, 'bid.placed', 'auction', auctionId, { max: amount, price: state.currentPrice });

    const updated = getAuctionRow(auctionId);
    const response = {
      auctionId,
      currentPrice: updated.current_price,
      bidCount: updated.bid_count,
      endAt: updated.end_at,
      winning: result.winning,
      yourMax: amount,
      extended: result.extended,
      reserveMet: updated.reserve_price === null ? null : updated.current_price >= updated.reserve_price,
      minNextBid: auctionLive(updated).minNextBid,
      currency: updated.currency,
    };
    if (idempotencyKey) {
      db().run(
        'INSERT INTO idempotency_keys (user_id, key, response, created_at) VALUES (?, ?, ?, ?)',
        userId, idempotencyKey, JSON.stringify(response), now,
      );
    }
    // Instantly outbid newcomers learn it from the response; previous leaders get a notification.
    return { response, updated, outbidUserId: result.outbidUserId };
  });

  broadcast(outcome.updated);
  if (outcome.outbidUserId) {
    notify(outcome.outbidUserId, {
      type: 'outbid',
      title: '¡Te han superado!',
      body: `Han superado tu puja en «${outcome.updated.title}». Precio actual: ${formatEur(outcome.updated.current_price)}`,
      auctionId,
    });
  }
  return outcome.response;
}

export function buyNow(userId: string, auctionId: string) {
  const now = Date.now();
  const order = db().transaction(() => {
    const row = getAuctionRow(auctionId);
    if (row.status !== 'active' || now >= row.end_at) throw conflict('La subasta ha terminado', 'AUCTION_ENDED');
    if (row.seller_id === userId) throw forbidden('No puedes comprar tu propio artículo', 'SELLER_CANNOT_BID');
    if (row.buy_now_price === null) throw conflict('Este artículo no tiene compra inmediata', 'NO_BUY_NOW');
    if (!buyNowAvailable(row)) {
      throw conflict('La compra inmediata ya no está disponible', 'BUY_NOW_UNAVAILABLE');
    }
    db().run(
      'INSERT INTO bids (id, auction_id, bidder_id, amount, is_proxy, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      id(), auctionId, userId, row.buy_now_price, now,
    );
    db().run(
      `UPDATE auctions SET current_price = buy_now_price, leader_id = ?, end_at = ?, bid_count = bid_count + 1,
       status = 'sold', seq = seq + 1 WHERE id = ?`,
      userId, now, auctionId,
    );
    db().audit(userId, 'auction.buy_now', 'auction', auctionId);
    return createOrder(getAuctionRow(auctionId), userId, now);
  });
  afterClose(getAuctionRow(auctionId), { status: 'sold', winnerId: userId, price: order.hammer_price });
  return order;
}

// ---------------------------------------------------------------- closing

function createOrder(row: Row, buyerId: string, now: number): Row {
  const existing = db().get('SELECT * FROM orders WHERE auction_id = ?', row.id);
  if (existing) return existing; // closing is idempotent
  const breakdown = computeOrder(row.current_price, row.shipping_cost);
  const orderId = id();
  db().run(
    `INSERT INTO orders (id, auction_id, buyer_id, seller_id, currency, hammer_price, buyer_fee, tax, shipping_cost,
      total, seller_fee, seller_payout, status, payment_due_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?)`,
    orderId, row.id, buyerId, row.seller_id, row.currency, breakdown.hammerPrice, breakdown.buyerFee, breakdown.tax,
    breakdown.shippingCost, breakdown.total, breakdown.sellerFee, breakdown.sellerPayout, now + config.paymentWindowMs, now,
  );
  return db().get('SELECT * FROM orders WHERE id = ?', orderId)!;
}

/** Closes one auction whose end time has passed. Safe to call repeatedly. */
export function closeAuction(auctionId: string, now = Date.now()) {
  const result = db().transaction(() => {
    const row = getAuctionRow(auctionId);
    if (row.status !== 'active' || row.end_at > now) return null;
    const outcome = closeOutcome(loadState(row));
    db().run('UPDATE auctions SET status = ?, seq = seq + 1 WHERE id = ?', outcome.status, auctionId);
    if (outcome.status === 'sold') createOrder(getAuctionRow(auctionId), outcome.winnerId, now);
    db().audit(null, 'auction.closed', 'auction', auctionId, outcome);
    return outcome;
  });
  if (result) afterClose(getAuctionRow(auctionId), result);
  return result;
}

function afterClose(row: Row, outcome: ReturnType<typeof closeOutcome>) {
  broadcast(row);
  const order = db().get('SELECT id FROM orders WHERE auction_id = ?', row.id);
  if (outcome.status === 'sold') {
    notify(outcome.winnerId, {
      type: 'won',
      title: '¡Has ganado la subasta!',
      body: `«${row.title}» es tuyo por ${formatEur(outcome.price)}. Completa el pago para recibirlo.`,
      auctionId: row.id,
      orderId: order?.id,
    });
    notify(row.seller_id, {
      type: 'sold',
      title: '¡Artículo vendido!',
      body: `«${row.title}» se ha vendido por ${formatEur(outcome.price)}. Te avisaremos cuando se pague.`,
      auctionId: row.id,
      orderId: order?.id,
    });
    const losers = db().all(
      'SELECT DISTINCT bidder_id FROM max_bids WHERE auction_id = ? AND bidder_id != ?', row.id, outcome.winnerId,
    );
    for (const loser of losers) {
      notify(loser.bidder_id, {
        type: 'lost',
        title: 'Subasta finalizada',
        body: `«${row.title}» terminó en ${formatEur(outcome.price)}. ¡Suerte la próxima vez!`,
        auctionId: row.id,
      });
    }
  } else {
    notify(row.seller_id, {
      type: 'not_sold',
      title: 'Subasta finalizada sin venta',
      body:
        outcome.status === 'no_bids'
          ? `«${row.title}» terminó sin pujas. Puedes volver a publicarlo con otro precio.`
          : `«${row.title}» no alcanzó el precio de reserva.`,
      auctionId: row.id,
    });
  }
}

/** Opens scheduled auctions and closes expired ones. Driven by the scheduler. */
export function tickAuctions(now = Date.now()) {
  const toStart = db().all("SELECT id FROM auctions WHERE status = 'scheduled' AND start_at <= ?", now);
  for (const { id: auctionId } of toStart) {
    db().run("UPDATE auctions SET status = 'active', seq = seq + 1 WHERE id = ? AND status = 'scheduled'", auctionId);
    broadcast(getAuctionRow(auctionId));
  }
  const toClose = db().all("SELECT id FROM auctions WHERE status = 'active' AND end_at <= ?", now);
  for (const { id: auctionId } of toClose) closeAuction(auctionId, now);

  // "Ending soon" heads-up to watchers, once, 10 minutes before the end.
  const endingSoon = db().all(
    `SELECT a.id, a.title, w.user_id FROM auctions a JOIN watchlist w ON w.auction_id = a.id
     WHERE a.status = 'active' AND a.end_at - ? BETWEEN 0 AND 600000
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = w.user_id AND n.auction_id = a.id AND n.type = 'ending_soon')`,
    now,
  );
  for (const item of endingSoon) {
    notify(item.user_id, {
      type: 'ending_soon',
      title: 'Termina en menos de 10 minutos',
      body: `«${item.title}», que sigues, está a punto de terminar.`,
      auctionId: item.id,
    });
  }
}

// ---------------------------------------------------------------- watchlist & questions

export function setWatching(userId: string, auctionId: string, watching: boolean) {
  getAuctionRow(auctionId);
  db().transaction(() => {
    const exists = db().get('SELECT 1 AS x FROM watchlist WHERE user_id = ? AND auction_id = ?', userId, auctionId);
    if (watching && !exists) {
      db().run('INSERT INTO watchlist (user_id, auction_id, created_at) VALUES (?, ?, ?)', userId, auctionId, Date.now());
      db().run('UPDATE auctions SET watch_count = watch_count + 1 WHERE id = ?', auctionId);
    } else if (!watching && exists) {
      db().run('DELETE FROM watchlist WHERE user_id = ? AND auction_id = ?', userId, auctionId);
      db().run('UPDATE auctions SET watch_count = MAX(watch_count - 1, 0) WHERE id = ?', auctionId);
    }
  });
  return { watching };
}

export function listQuestions(auctionId: string) {
  return db()
    .all(
      `SELECT q.*, u.display_name FROM questions q JOIN users u ON u.id = q.asker_id
       WHERE q.auction_id = ? ORDER BY q.created_at DESC`,
      auctionId,
    )
    .map((q) => ({
      id: q.id,
      asker: maskName(q.display_name),
      question: q.question,
      answer: q.answer,
      createdAt: q.created_at,
      answeredAt: q.answered_at,
    }));
}

export function askQuestion(userId: string, auctionId: string, text: string) {
  const row = getAuctionRow(auctionId);
  const question = String(text ?? '').trim();
  if (row.seller_id === userId) throw forbidden('No puedes preguntar en tu propio anuncio');
  if (question.length < 5 || question.length > 500) throw badRequest('La pregunta debe tener entre 5 y 500 caracteres');
  if (containsContactDetails(question)) throw badRequest('No compartas datos de contacto', 'CONTACT_DETAILS');
  const questionId = id();
  db().run(
    'INSERT INTO questions (id, auction_id, asker_id, question, created_at) VALUES (?, ?, ?, ?, ?)',
    questionId, auctionId, userId, question, Date.now(),
  );
  notify(row.seller_id, { type: 'question', title: 'Nueva pregunta', body: `Sobre «${row.title}»: ${question}`, auctionId });
  emitToAuction(auctionId, 'auction:questions', {});
  return { id: questionId };
}

export function answerQuestion(userId: string, questionId: string, text: string) {
  const q = db().get('SELECT * FROM questions WHERE id = ?', questionId);
  if (!q) throw notFound('Pregunta no encontrada');
  const row = getAuctionRow(q.auction_id);
  if (row.seller_id !== userId) throw forbidden('Solo el vendedor puede responder');
  const answer = String(text ?? '').trim();
  if (answer.length < 1 || answer.length > 1000) throw badRequest('Respuesta no válida');
  if (containsContactDetails(answer)) throw badRequest('No compartas datos de contacto', 'CONTACT_DETAILS');
  db().run('UPDATE questions SET answer = ?, answered_at = ? WHERE id = ?', answer, Date.now(), questionId);
  notify(q.asker_id, { type: 'answer', title: 'El vendedor ha respondido', body: `«${row.title}»: ${answer}`, auctionId: row.id });
  emitToAuction(row.id, 'auction:questions', {});
  return { ok: true };
}

export function formatEur(cents: number) {
  return `${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

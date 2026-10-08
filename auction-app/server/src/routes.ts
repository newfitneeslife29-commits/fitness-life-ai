import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { config } from './config.ts';
import { getDb, id } from './db.ts';
import { hashPassword, optionalAuth, requireAuth, signToken, verifyPassword } from './auth.ts';
import { ApiError, badRequest, conflict, notFound } from './errors.ts';
import * as auctions from './services/auctions.ts';
import * as orders from './services/orders.ts';
import { auctionDetail, auctionSummary, orderView, publicUser } from './services/serialize.ts';
import { computeOrder } from './money.ts';

type Handler = (req: Request, res: Response) => unknown;

/** Wraps sync/async handlers: JSON response + serverTime, errors to the error middleware. */
const h = (fn: Handler) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) res.json(result ?? { ok: true });
  } catch (err) {
    next(err);
  }
};

const param = (req: Request, name: string) => String(req.params[name]);
const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
const db = () => getDb();

export const router = Router();

// Every response carries the server clock so clients can correct countdowns (§14.3).
router.use((_req, res, next) => {
  res.setHeader('X-Server-Time', String(Date.now()));
  next();
});

router.get('/health', h(() => ({ ok: true, serverTime: Date.now() })));

// ------------------------------------------------------------------ auth

router.post(
  '/auth/register',
  h((req) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.displayName ?? '').trim();
    const city = str(req.body?.city)?.trim() || null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Email no válido');
    if (password.length < 8) throw badRequest('La contraseña debe tener al menos 8 caracteres');
    if (displayName.length < 2 || displayName.length > 30) throw badRequest('El nombre debe tener entre 2 y 30 caracteres');
    if (db().get('SELECT id FROM users WHERE email = ?', email)) throw conflict('Ya existe una cuenta con ese email', 'EMAIL_TAKEN');
    const userId = id();
    db().run(
      'INSERT INTO users (id, email, display_name, password_hash, city, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      userId, email, displayName, hashPassword(password), city, Date.now(),
    );
    db().audit(userId, 'user.registered', 'user', userId);
    return { token: signToken(userId), user: me(userId) };
  }),
);

router.post(
  '/auth/login',
  h((req) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const user = db().get('SELECT * FROM users WHERE email = ?', email);
    if (!user || !verifyPassword(String(req.body?.password ?? ''), user.password_hash)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
    }
    if (user.status !== 'active') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida');
    return { token: signToken(user.id), user: me(user.id) };
  }),
);

function me(userId: string) {
  const row = db().get('SELECT * FROM users WHERE id = ?', userId);
  if (!row) throw notFound('Usuario no encontrado');
  const unread = db().get<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0', userId)!.n;
  return { ...publicUser(row), email: row.email as string, unpaidStrikes: row.unpaid_strikes as number, unreadNotifications: unread };
}

router.get('/me', requireAuth, h((req) => me(req.userId!)));

router.patch(
  '/me',
  requireAuth,
  h((req) => {
    const displayName = str(req.body?.displayName)?.trim();
    const city = str(req.body?.city)?.trim();
    if (displayName !== undefined) {
      if (displayName.length < 2 || displayName.length > 30) throw badRequest('El nombre debe tener entre 2 y 30 caracteres');
      db().run('UPDATE users SET display_name = ? WHERE id = ?', displayName, req.userId!);
    }
    if (city !== undefined) db().run('UPDATE users SET city = ? WHERE id = ?', city || null, req.userId!);
    return me(req.userId!);
  }),
);

router.get(
  '/users/:id',
  h((req) => {
    const row = db().get('SELECT * FROM users WHERE id = ?', param(req, 'id'));
    if (!row) throw notFound('Usuario no encontrado');
    const reviews = db()
      .all(
        `SELECT r.rating, r.comment, r.created_at, u.display_name FROM reviews r JOIN users u ON u.id = r.author_id
         WHERE r.target_id = ? ORDER BY r.created_at DESC LIMIT 20`,
        row.id,
      )
      .map((r) => ({ rating: r.rating, comment: r.comment, author: r.display_name, createdAt: r.created_at }));
    const active = auctions.listAuctions({ sellerId: row.id, status: 'active', limit: 20 }).map(auctionSummary);
    return { user: publicUser(row), reviews, activeAuctions: active };
  }),
);

// ------------------------------------------------------------------ catalog

router.get('/categories', h(() => db().all('SELECT id, name, icon FROM categories ORDER BY position')));

router.get(
  '/auctions',
  h((req) => {
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const rows = auctions.listAuctions({
      q: str(req.query.q),
      category: str(req.query.category),
      sort: str(req.query.sort),
      limit,
      offset,
    });
    const items = rows.slice(0, limit).map(auctionSummary);
    return { items, nextOffset: rows.length > limit ? offset + limit : null, serverTime: Date.now() };
  }),
);

router.get(
  '/auctions/:id',
  optionalAuth,
  h((req) => {
    const auctionId = param(req, 'id');
    const row = auctions.getAuctionRow(auctionId);
    const userId = req.userId;
    if (['rejected', 'cancelled'].includes(row.status) && row.seller_id !== userId) throw notFound('La subasta no existe');
    if (row.seller_id !== userId) auctions.countView(auctionId);
    const seller = publicUser(db().get('SELECT * FROM users WHERE id = ?', row.seller_id)!);
    let viewer = null;
    if (userId) {
      const max = db().get('SELECT max_amount FROM max_bids WHERE auction_id = ? AND bidder_id = ?', auctionId, userId);
      const watching = !!db().get('SELECT 1 AS x FROM watchlist WHERE user_id = ? AND auction_id = ?', userId, auctionId);
      const order = db().get('SELECT id FROM orders WHERE auction_id = ? AND (buyer_id = ? OR seller_id = ?)', auctionId, userId, userId);
      viewer = {
        isSeller: row.seller_id === userId,
        isLeading: row.leader_id === userId,
        myMax: (max?.max_amount as number | undefined) ?? null,
        watching,
        orderId: (order?.id as string | undefined) ?? null,
      };
    }
    return {
      auction: auctionDetail(row),
      seller,
      bids: auctions.recentBids(auctionId),
      questions: auctions.listQuestions(auctionId),
      viewer,
      fees: { buyerPremiumBps: config.fees.buyerPremiumBps, vatBps: config.fees.vatBps },
      serverTime: Date.now(),
    };
  }),
);

router.get('/auctions/:id/bids', h((req) => auctions.recentBids(param(req, 'id'), 100)));

router.post(
  '/auctions',
  requireAuth,
  h((req) => auctionDetail(auctions.createAuction(req.userId!, req.body ?? {}))),
);

router.post('/auctions/:id/cancel', requireAuth, h((req) => auctionDetail(auctions.cancelAuction(req.userId!, param(req, 'id')))));

router.post(
  '/auctions/:id/bids',
  requireAuth,
  h((req) =>
    auctions.placeBid(req.userId!, param(req, 'id'), Number(req.body?.maxAmount), str(req.headers['idempotency-key'])),
  ),
);

router.post(
  '/auctions/:id/buy-now',
  requireAuth,
  h((req) => orderView(auctions.buyNow(req.userId!, param(req, 'id')))),
);

router.get(
  '/auctions/:id/quote',
  h((req) => {
    const row = auctions.getAuctionRow(param(req, 'id'));
    const amount = Number(req.query.amount ?? row.current_price);
    return computeOrder(Number.isInteger(amount) ? amount : row.current_price, row.shipping_cost);
  }),
);

router.post('/auctions/:id/watch', requireAuth, h((req) => auctions.setWatching(req.userId!, param(req, 'id'), true)));
router.delete('/auctions/:id/watch', requireAuth, h((req) => auctions.setWatching(req.userId!, param(req, 'id'), false)));

router.post(
  '/auctions/:id/questions',
  requireAuth,
  h((req) => auctions.askQuestion(req.userId!, param(req, 'id'), req.body?.question)),
);
router.post(
  '/questions/:id/answer',
  requireAuth,
  h((req) => auctions.answerQuestion(req.userId!, param(req, 'id'), req.body?.answer)),
);

// ------------------------------------------------------------------ my activity

router.get(
  '/me/bids',
  requireAuth,
  h((req) =>
    db()
      .all(
        `SELECT a.*, m.max_amount AS my_max FROM max_bids m JOIN auctions a ON a.id = m.auction_id
         WHERE m.bidder_id = ? ORDER BY (a.status = 'active') DESC, a.end_at ASC LIMIT 100`,
        req.userId!,
      )
      .map((row) => ({ ...auctionSummary(row), myMax: row.my_max as number, isLeading: row.leader_id === req.userId })),
  ),
);

router.get(
  '/me/watchlist',
  requireAuth,
  h((req) =>
    db()
      .all(
        `SELECT a.* FROM watchlist w JOIN auctions a ON a.id = w.auction_id WHERE w.user_id = ?
         ORDER BY (a.status = 'active') DESC, a.end_at ASC LIMIT 100`,
        req.userId!,
      )
      .map(auctionSummary),
  ),
);

router.get(
  '/me/selling',
  requireAuth,
  h((req) =>
    db()
      .all(
        `SELECT a.* FROM auctions a WHERE a.seller_id = ?
         ORDER BY CASE a.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, a.created_at DESC LIMIT 100`,
        req.userId!,
      )
      .map((row) => ({ ...auctionSummary(row), rejectionReason: row.rejection_reason as string | null })),
  ),
);

router.get(
  '/me/orders',
  requireAuth,
  h((req) =>
    db()
      .all(
        `SELECT o.*, a.title, a.images FROM orders o JOIN auctions a ON a.id = o.auction_id
         WHERE o.buyer_id = ? OR o.seller_id = ? ORDER BY o.created_at DESC LIMIT 100`,
        req.userId!, req.userId!,
      )
      .map((row) => ({
        ...orderView(row),
        title: row.title as string,
        image: (JSON.parse(row.images) as string[])[0] ?? null,
        role: row.buyer_id === req.userId ? 'buyer' : 'seller',
      })),
  ),
);

router.get(
  '/me/notifications',
  requireAuth,
  h((req) =>
    db()
      .all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', req.userId!)
      .map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        auctionId: n.auction_id,
        orderId: n.order_id,
        read: !!n.read,
        createdAt: n.created_at,
      })),
  ),
);

router.post(
  '/me/notifications/read',
  requireAuth,
  h((req) => {
    db().run('UPDATE notifications SET read = 1 WHERE user_id = ?', req.userId!);
    return { ok: true };
  }),
);

// ------------------------------------------------------------------ orders

router.get(
  '/orders/:id',
  requireAuth,
  h((req) => {
    const order = orders.getOrderFor(req.userId!, param(req, 'id'));
    const auction = auctions.getAuctionRow(order.auction_id);
    const counterpartId = order.buyer_id === req.userId ? order.seller_id : order.buyer_id;
    const counterpart = publicUser(db().get('SELECT * FROM users WHERE id = ?', counterpartId)!);
    return {
      order: orderView(order),
      auction: auctionSummary(auction),
      role: order.buyer_id === req.userId ? 'buyer' : 'seller',
      counterpart,
      reviewed: orders.hasReviewed(req.userId!, order.id),
    };
  }),
);

router.post('/orders/:id/pay', requireAuth, h(async (req) => orderView(await orders.payOrder(req.userId!, param(req, 'id'), req.body ?? {}))));
router.post(
  '/orders/:id/ship',
  requireAuth,
  h((req) => orderView(orders.shipOrder(req.userId!, param(req, 'id'), req.body?.carrier, req.body?.trackingNumber))),
);
router.post(
  '/orders/:id/confirm-delivery',
  requireAuth,
  h(async (req) => orderView(await orders.confirmDelivery(req.userId!, param(req, 'id')))),
);
router.post(
  '/orders/:id/dispute',
  requireAuth,
  h((req) => orderView(orders.openDispute(req.userId!, param(req, 'id'), req.body?.reason))),
);
router.post(
  '/orders/:id/review',
  requireAuth,
  h((req) => orders.reviewOrder(req.userId!, param(req, 'id'), Number(req.body?.rating), str(req.body?.comment))),
);

// ------------------------------------------------------------------ uploads

mkdirSync(config.uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${id()}${extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype)),
});

router.post(
  '/uploads',
  requireAuth,
  upload.single('file'),
  h((req) => {
    if (!req.file) throw badRequest('Sube una imagen JPG, PNG, WEBP o HEIC de hasta 8 MB');
    // Relative URL: clients resolve it against the API base, so it survives host changes.
    return { url: `/uploads/${req.file.filename}` };
  }),
);

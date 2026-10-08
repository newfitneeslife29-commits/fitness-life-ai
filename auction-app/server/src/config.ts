// Central configuration. Every value can be overridden with an environment variable.
const env = process.env;

const num = (value: string | undefined, fallback: number) =>
  value !== undefined && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : fallback;

export const config = {
  port: num(env.PORT, 4000),
  /** Public base URL used to build image URLs. Defaults to the request host. */
  publicUrl: env.PUBLIC_URL ?? '',
  jwtSecret: env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: '30d',
  dbFile: env.DB_FILE ?? 'data/subastia.db',
  uploadsDir: env.UPLOADS_DIR ?? 'uploads',
  currency: 'EUR',

  /** Anti-sniping: a bid in the last N ms pushes the close to now + N ms. */
  antiSnipingMs: num(env.ANTI_SNIPING_SECONDS, 120) * 1000,
  /** Time the winner has to pay. */
  paymentWindowMs: num(env.PAYMENT_WINDOW_HOURS, 48) * 3600 * 1000,
  /** A shipped order is auto-completed after this long without a dispute. */
  autoCompleteMs: num(env.AUTO_COMPLETE_DAYS, 14) * 24 * 3600 * 1000,
  schedulerIntervalMs: num(env.SCHEDULER_INTERVAL_MS, 1000),

  fees: {
    /** Buyer's premium, in basis points (500 = 5 %). */
    buyerPremiumBps: num(env.BUYER_PREMIUM_BPS, 500),
    /** Seller commission on the hammer price. */
    sellerFeeBps: num(env.SELLER_FEE_BPS, 800),
    /** VAT applied to the buyer's premium. */
    vatBps: num(env.VAT_BPS, 2100),
  },

  /** Bids per user allowed inside the rate-limit window. */
  bidRateLimit: { max: 10, windowMs: 10_000 },
  /** Users with this many unpaid auctions can no longer bid. */
  maxUnpaidStrikes: 3,

  allowedDurationsDays: [1, 3, 5, 7, 10],
} as const;

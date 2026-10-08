import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword } from './auth.ts';
import { config } from './config.ts';
import { getDb, id } from './db.ts';
import { placeBid } from './services/auctions.ts';

// Demo data so the app is usable on first launch. Accounts (password: subastia123):
//   ana@demo.com · luis@demo.com · marta@demo.com · javier@demo.com

export const DEMO_PASSWORD = 'subastia123';

const CATEGORIES: Array<[string, string, string]> = [
  ['watches', 'Relojes', 'watch'],
  ['electronics', 'Electrónica', 'hardware-chip'],
  ['art', 'Arte', 'color-palette'],
  ['collectibles', 'Coleccionismo', 'diamond'],
  ['fashion', 'Moda', 'shirt'],
  ['home', 'Hogar', 'home'],
  ['sports', 'Deporte', 'bicycle'],
  ['vehicles', 'Motor', 'car-sport'],
];

const USERS: Array<[string, string, string]> = [
  ['ana@demo.com', 'Ana', 'Madrid'],
  ['luis@demo.com', 'Luis', 'Barcelona'],
  ['marta@demo.com', 'Marta', 'Valencia'],
  ['javier@demo.com', 'Javier', 'Sevilla'],
];

const PALETTES: Record<string, [string, string]> = {
  watches: ['#1F2937', '#B08D57'],
  electronics: ['#0F172A', '#3B82F6'],
  art: ['#7C2D12', '#F59E0B'],
  collectibles: ['#4C1D95', '#EC4899'],
  fashion: ['#831843', '#F472B6'],
  home: ['#14532D', '#84CC16'],
  sports: ['#0C4A6E', '#22D3EE'],
  vehicles: ['#450A0A', '#EF4444'],
};

interface DemoItem {
  seller: number;
  category: string;
  title: string;
  description: string;
  condition: string;
  start: number;
  reserve?: number;
  buyNow?: number;
  shipping: number;
  endsInMinutes: number;
  bids?: Array<[bidder: number, max: number]>;
}

const ITEMS: DemoItem[] = [
  {
    seller: 0, category: 'watches', title: 'Reloj automático Seiko Presage Cocktail Time',
    description: 'Esfera azul con textura, movimiento automático 4R35 y cristal Hardlex. Usado con mucho cuidado, sin arañazos visibles. Incluye caja y papeles originales.',
    condition: 'like_new', start: 15000, reserve: 25000, shipping: 690, endsInMinutes: 4,
    bids: [[1, 18000], [2, 21000]],
  },
  {
    seller: 1, category: 'electronics', title: 'Cámara Fujifilm X100V plateada',
    description: 'Cámara compacta con sensor APS-C de 26 MP y objetivo 23 mm f/2. Unos 4.000 disparos. Se entrega con dos baterías, cargador y funda de piel.',
    condition: 'good', start: 70000, buyNow: 125000, shipping: 990, endsInMinutes: 45,
  },
  {
    seller: 2, category: 'art', title: 'Óleo sobre lienzo «Puerto al atardecer»',
    description: 'Pintura original firmada por el autor, 60 × 80 cm, con marco de madera. Certificado de autenticidad incluido. Recogida en mano o envío asegurado.',
    condition: 'new', start: 20000, reserve: 40000, shipping: 2500, endsInMinutes: 180,
    bids: [[0, 26000], [3, 30000]],
  },
  {
    seller: 3, category: 'collectibles', title: 'Colección de monedas de 2 € conmemorativas',
    description: 'Álbum con 48 monedas conmemorativas de 2 € de distintos países, en estado sin circular. Ideal para coleccionistas o para iniciar una colección.',
    condition: 'like_new', start: 9000, shipping: 490, endsInMinutes: 12,
    bids: [[0, 9500], [1, 12000]],
  },
  {
    seller: 0, category: 'fashion', title: 'Bolso de piel artesanal hecho en Ubrique',
    description: 'Bolso de piel de vacuno curtida al vegetal, cosido a mano en Ubrique. Color cuero, cierre magnético y bandolera ajustable. A estrenar con etiquetas.',
    condition: 'new', start: 6000, buyNow: 14000, shipping: 590, endsInMinutes: 60 * 26,
  },
  {
    seller: 1, category: 'home', title: 'Lámpara de pie de diseño nórdico en roble',
    description: 'Lámpara de pie con estructura de roble macizo y pantalla de lino. Altura 160 cm. Funciona perfectamente; bombilla LED incluida.',
    condition: 'good', start: 4000, shipping: 1290, endsInMinutes: 60 * 50,
    bids: [[3, 4500]],
  },
  {
    seller: 2, category: 'sports', title: 'Bicicleta de carretera de carbono talla 54',
    description: 'Cuadro de carbono, grupo Shimano 105 de 11 velocidades, ruedas de aluminio. Revisada hace un mes en taller. Pequeños roces de uso en la vaina.',
    condition: 'good', start: 60000, reserve: 90000, shipping: 3500, endsInMinutes: 60 * 72,
    bids: [[1, 65000]],
  },
  {
    seller: 3, category: 'vehicles', title: 'Vespa clásica de 1978 restaurada',
    description: 'Vespa restaurada por completo: motor revisado, pintura nueva y tapicería original. Documentación en regla e ITV al día. Solo recogida en Sevilla.',
    condition: 'like_new', start: 250000, reserve: 400000, shipping: 0, endsInMinutes: 60 * 120,
    bids: [[0, 260000], [2, 300000]],
  },
  {
    seller: 0, category: 'electronics', title: 'Consola retro con 2 mandos y 20 juegos',
    description: 'Consola clásica de 16 bits en perfecto funcionamiento, con dos mandos originales y 20 cartuchos. Cables y fuente de alimentación incluidos.',
    condition: 'good', start: 5000, shipping: 690, endsInMinutes: 25,
    bids: [[2, 7000], [3, 6500]],
  },
  {
    seller: 1, category: 'collectibles', title: 'Primera edición de cómic firmada por el autor',
    description: 'Primera edición en tapa dura, firmada y dedicada por el autor en una presentación. Conservada en funda protectora; las esquinas están perfectas.',
    condition: 'like_new', start: 3000, buyNow: 9000, shipping: 390, endsInMinutes: 60 * 8,
  },
];

function escapeXml(text: string) {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

/** Generates an on-brand illustration so the demo needs no external image host. */
function writeDemoImage(file: string, title: string, category: string, variant: number) {
  const [from, to] = PALETTES[category] ?? ['#111827', '#6366F1'];
  const words = title.split(' ');
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= 18) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const text = lines
    .slice(0, 4)
    .map((line, i) => `<text x="60" y="${330 + i * 64}" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="#fff">${escapeXml(line)}</text>`)
    .join('');
  const cx = 600 - variant * 90;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="${cx}" cy="150" r="${170 + variant * 30}" fill="#fff" fill-opacity="0.08"/>
  <circle cx="${cx + 80}" cy="80" r="90" fill="#fff" fill-opacity="0.10"/>
  <text x="60" y="110" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="6" fill="#fff" fill-opacity="0.75">SUBASTIA · LOTE DEMO</text>
  ${text}
</svg>`;
  writeFileSync(file, svg);
}

export function seed() {
  const db = getDb();
  const now = Date.now();
  const demoDir = join(config.uploadsDir, 'demo');
  mkdirSync(demoDir, { recursive: true });

  db.transaction(() => {
    CATEGORIES.forEach(([catId, name, icon], position) => {
      db.run('INSERT OR IGNORE INTO categories (id, name, icon, position) VALUES (?, ?, ?, ?)', catId, name, icon, position);
    });
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const userIds = USERS.map(([email, name, city], i) => {
    const existing = db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return existing.id as string;
    const userId = id();
    db.run(
      `INSERT INTO users (id, email, display_name, password_hash, city, rating_sum, rating_count, sales_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId, email, name, passwordHash, city, 4 * (6 + i) + i, 6 + i, 6 + i, now - (400 - i * 60) * 86_400_000,
    );
    return userId;
  });

  ITEMS.forEach((item, index) => {
    const auctionId = id();
    const images = [0, 1, 2].map((variant) => {
      const name = `lot-${index + 1}-${variant + 1}.svg`;
      writeDemoImage(join(demoDir, name), item.title, item.category, variant);
      return `/uploads/demo/${name}`;
    });
    const endAt = now + item.endsInMinutes * 60_000;
    db.run(
      `INSERT INTO auctions (id, seller_id, category_id, title, description, condition, images, location, currency,
        starting_price, reserve_price, buy_now_price, shipping_cost, current_price, start_at, end_at, original_end_at,
        status, watch_count, view_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      auctionId, userIds[item.seller]!, item.category, item.title, item.description, item.condition,
      JSON.stringify(images), USERS[item.seller]![2], config.currency, item.start, item.reserve ?? null, item.buyNow ?? null,
      item.shipping, item.start, now - 86_400_000, endAt, endAt, 3 + index * 2, 40 + index * 17, now - 86_400_000 + index,
    );
    for (const [bidder, max] of item.bids ?? []) placeBid(userIds[bidder]!, auctionId, max);
  });
  db.run('DELETE FROM notifications');
  console.log(`Datos de demostración creados: ${USERS.length} usuarios, ${ITEMS.length} subastas.`);
}

export function seedIfEmpty() {
  const { n } = getDb().get<{ n: number }>('SELECT COUNT(*) AS n FROM users')!;
  if (n === 0) seed();
}

/**
 * Demo "rival" bidders so the realtime features can be seen with one phone.
 * Enabled with DEMO_BOTS=1. Never enable in production.
 */
export function startDemoBots(intervalMs = 20_000) {
  return setInterval(() => {
    const db = getDb();
    const bots = db.all(`SELECT id FROM users WHERE email IN (${USERS.map(() => '?').join(',')})`, ...USERS.map((u) => u[0]));
    const auction = db.get(
      "SELECT * FROM auctions WHERE status = 'active' AND bid_count > 0 ORDER BY RANDOM() LIMIT 1",
    );
    if (!auction || bots.length === 0) return;
    const candidates = bots.filter((b) => b.id !== auction.seller_id && b.id !== auction.leader_id);
    const bot = candidates[Math.floor(Math.random() * candidates.length)];
    if (!bot) return;
    try {
      const step = Math.max(100, Math.round(auction.current_price * 0.05));
      placeBid(bot.id, auction.id, auction.current_price + step);
    } catch {
      // Too low, rate limited or ended: just skip this round.
    }
  }, intervalMs);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const db = getDb();
  for (const table of ['ledger_entries', 'reviews', 'orders', 'questions', 'watchlist', 'idempotency_keys', 'bids', 'max_bids', 'notifications', 'auctions', 'audit_log']) {
    db.run(`DELETE FROM ${table}`);
  }
  seed();
}

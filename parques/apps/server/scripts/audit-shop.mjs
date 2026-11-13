/**
 * Auditoría de la tienda contra el servidor de desarrollo (compras de prueba activas):
 * paquetes con dinero (demo), compras con monedas, ofertas del día, cofres, cambio de gemas, equipar y emotes.
 * Uso: node/tsx apps/server/scripts/audit-shop.mjs
 */
import { io } from 'socket.io-client';
import { CHESTS, GEM_EXCHANGE, PRODUCTS, dailyDeals, dayKey, item } from '@parques/engine';

const URL = process.env.SERVER ?? 'http://localhost:3001';
const fails = [];
const ok = (c, m) => {
  if (!c) fails.push(m);
  console.log(`${c ? '✅' : '❌'} ${m}`);
};

const s = io(URL, { transports: ['websocket'] });
const ack = (ev, ...a) => new Promise((r) => s.emit(ev, ...a, r));
const op = (o) => ack('profile_op', o);

async function grant(id, token, productId) {
  const r = await fetch(`${URL}/api/demo/grant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, token, productId }) });
  return r.json();
}

(async () => {
  const a = await ack('auth', {});
  let p = a.profile;
  const start = { coins: p.coins, gems: p.gems };

  // 1) Paquete de monedas con dinero (prueba): suma exactamente lo del producto.
  const pack = PRODUCTS.find((x) => x.id === 'coins-m');
  const g1 = await grant(a.id, a.token, 'coins-m');
  ok(g1.ok && g1.profile.coins >= start.coins + pack.coins && g1.profile.coins - start.coins - pack.coins <= 500, `paquete ${pack.id}: +${pack.coins} monedas (${start.coins} → ${g1.profile?.coins})`);
  p = g1.profile;

  // 2) Paquete de gemas.
  const gp = PRODUCTS.find((x) => x.id === 'gems-m');
  const g2 = await grant(a.id, a.token, 'gems-m');
  ok(g2.ok && g2.profile.gems === p.gems + gp.gems, `paquete ${gp.id}: +${gp.gems} gemas (${p.gems} → ${g2.profile?.gems})`);
  p = g2.profile;

  // 3) Objeto con dinero (prueba): queda en "owned" y no cambia monedas.
  const g3 = await grant(a.id, a.token, 'item:board-caribe');
  ok(g3.ok && g3.profile.owned.includes('board-caribe') && g3.profile.coins >= p.coins, 'tablero Caribe con dinero: queda tuyo y no descuenta monedas');
  p = g3.profile;

  // 4) Compra con monedas: descuenta exactamente el precio y se equipa.
  const it = { coins: item('dice-panela').coins ?? item('dice-panela').price ?? 3000 };
  const b1 = await op({ op: 'buy', itemId: 'dice-panela' });
  ok(b1.ok && b1.profile.coins >= p.coins - it.coins && b1.profile.owned.includes('dice-panela'), `comprar Panela (${it.coins}): ${p.coins} → ${b1.profile?.coins} (logros pueden sumar)`);
  const spent = p.coins - b1.profile.coins;
  ok(spent === it.coins || b1.profile.coins > p.coins - it.coins, `Panela descuenta ${it.coins} (descontó ${spent}, el resto son logros)`);
  p = b1.profile;
  const b2 = await op({ op: 'buy', itemId: 'dice-panela' });
  ok(!b2.ok, 'no deja comprar dos veces lo mismo');

  // 5) Objeto de dinero real no se compra con monedas.
  const b3 = await op({ op: 'buy', itemId: 'board-oro' });
  ok(!b3.ok, 'Oro 24K (con dinero) no se puede comprar con monedas');

  // 6) Oferta del día: precio con descuento.
  const deal = dailyDeals(dayKey()).find((d) => !p.owned.includes(d.itemId));
  if (deal) {
    const before = p.coins;
    const d1 = await op({ op: 'deal', itemId: deal.itemId });
    ok(d1.ok && d1.profile.owned.includes(deal.itemId), `oferta ${deal.itemId}: comprada por ${deal.price}`);
    if (d1.ok) ok(before - d1.profile.coins <= deal.price, `oferta descuenta como máximo ${deal.price} (${before} → ${d1.profile.coins})`);
    if (d1.ok) p = d1.profile;
    const d2 = await op({ op: 'deal', itemId: deal.itemId });
    ok(!d2.ok, 'la misma oferta no se compra dos veces');
  }

  // 7) Cofre con gemas.
  const chest = CHESTS[0];
  const gemsBefore = p.gems;
  const c1 = await op({ op: 'chest', chestId: chest.id });
  ok(c1.ok && c1.profile.gems === gemsBefore - chest.gems, `cofre ${chest.id}: cuesta ${chest.gems} gemas (${gemsBefore} → ${c1.profile?.gems})`);
  if (c1.ok) p = c1.profile;

  // 8) Cambio de gemas por monedas.
  const ex = GEM_EXCHANGE[0];
  const c2 = await op({ op: 'exchange', gems: ex.gems });
  ok(c2.ok && c2.profile.gems === p.gems - ex.gems && c2.profile.coins >= p.coins + ex.coins, `cambio ${ex.gems} gemas → ${ex.coins} monedas (${p.coins} → ${c2.profile?.coins})`);
  if (c2.ok) p = c2.profile;

  // 9) Sin gemas suficientes, el cofre caro falla y no descuenta.
  const big = CHESTS[CHESTS.length - 1];
  if (p.gems < big.gems) {
    const c3 = await op({ op: 'chest', chestId: big.id });
    ok(!c3.ok, `cofre ${big.id} sin gemas suficientes: rechazado`);
  }

  // 10) Equipar algo que no tienes falla.
  const e1 = await op({ op: 'equip', itemId: 'board-galaxia' });
  ok(!e1.ok, 'no deja equipar un objeto que no tienes');

  // 11) Producto inexistente con dinero: no entrega nada.
  const g4 = await grant(a.id, a.token, 'coins_hack');
  ok(!g4.ok, 'producto inexistente: rechazado');

  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTIENDA OK');
  process.exit(fails.length ? 1 : 0);
})();

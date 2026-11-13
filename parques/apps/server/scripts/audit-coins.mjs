/**
 * Auditoría de monedas contra un servidor real (desarrollo).
 * Uso: PARQUES_TURN_MS=600 PARQUES_BOT_MS=60 npm run dev:server   y luego   node apps/server/scripts/audit-coins.mjs
 * Crea cuentas de invitado, juega cada modo hasta el final (la máquina juega por el humano cuando se vence su turno)
 * y comprueba: entrada cobrada una vez, premio = tabla de pagos, total = inicio − entrada + premio + nivel + logros,
 * y que nunca llegue el resultado dos veces.
 */
import { io } from 'socket.io-client';
import { payouts, TABLES } from '@parques/engine';

const URL = process.env.SERVER ?? 'http://localhost:3001';
const fails = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
};

function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const ack = (ev, ...args) => new Promise((res) => s.emit(ev, ...args, res));
  return { s, ack };
}

async function guest() {
  const c = client();
  const r = await c.ack('auth', {});
  return { ...c, id: r.id, profile: r.profile };
}

/** Espera el resultado de la partida; cuenta cuántos llegan (debe ser 1). */
function waitResult(c, ms = 240000) {
  return new Promise((res, rej) => {
    const results = [];
    let charged = null;
    c.s.on('profile', (p) => {
      if (charged === null) charged = p.coins;
    });
    c.s.on('match_result', (r) => {
      results.push(r);
      setTimeout(() => res({ results, charged }), 1500);
    });
    setTimeout(() => rej(new Error('sin resultado a tiempo')), ms);
  });
}

function expected(start, outcome) {
  const ach = outcome.achievements.reduce((t, a) => t + (a.coins ?? 0), 0);
  return start - outcome.entry + outcome.coins + outcome.levelCoins + ach;
}

async function playAi(label, opts) {
  const g = await guest();
  const start = g.profile.coins;
  const table = opts.table ? TABLES.find((t) => t.id === opts.table) : null;
  const wait = waitResult(g);
  const r = await g.ack('play_ai', opts);
  ok(r.ok, `${label}: la partida empieza`);
  if (!r.ok) return g.s.close();
  const { results, charged } = await wait;
  ok(results.length === 1, `${label}: el resultado llega una sola vez (${results.length})`);
  const res = results[0];
  const out = res.outcome;
  const entry = table?.entry ?? 0;
  ok(out.entry === entry, `${label}: entrada ${out.entry} = ${entry}`);
  if (charged !== null && entry) ok(charged === start - entry, `${label}: al empezar se cobró la entrada (${start} → ${charged})`);
  const place = res.profile.stats.games === 1 ? null : null;
  const pay = payouts(entry, opts.players, !!opts.teams);
  ok(pay.includes(out.coins), `${label}: premio ${out.coins} está en la tabla de pagos [${pay.join(', ')}]`);
  const exp = expected(start, out);
  ok(res.profile.coins === exp, `${label}: monedas finales ${res.profile.coins} = ${start} − ${out.entry} + ${out.coins} + nivel ${out.levelCoins} + logros (${exp})`);
  const sum = pay.reduce((a, b) => a + b, 0);
  ok(sum <= entry * opts.players, `${label}: lo que se paga (${sum}) no supera lo que entra (${entry * opts.players})`);
  g.s.close();
  void place;
}

async function playOnlinePair() {
  const a = await guest();
  const b = await guest();
  const startA = a.profile.coins;
  const startB = b.profile.coins;
  const wa = waitResult(a);
  const wb = waitResult(b);
  ok((await a.ack('quick_match', 'barrio')).ok, 'online: A busca partida');
  ok((await b.ack('quick_match', 'barrio')).ok, 'online: B busca partida');
  const [ra, rb] = await Promise.all([wa, wb]);
  for (const [n, r, st] of [['A', ra, startA], ['B', rb, startB]]) {
    ok(r.results.length === 1, `online ${n}: resultado una sola vez`);
    const out = r.results[0].outcome;
    ok(r.results[0].profile.coins === expected(st, out), `online ${n}: monedas cuadran (${r.results[0].profile.coins})`);
  }
  a.s.close();
  b.s.close();
}

async function onlineResign() {
  const a = await guest();
  const b = await guest();
  const startB = b.profile.coins;
  const wa = waitResult(a);
  await a.ack('quick_match', 'barrio');
  await b.ack('quick_match', 'barrio');
  // Esperar a que empiece y B se va.
  await new Promise((res) => b.s.once('sync', res).once('update', res));
  await new Promise((r) => setTimeout(r, 1200));
  b.s.emit('leave');
  const r = await wa;
  ok(r.results.length === 1, 'abandono online: A termina la partida y recibe su resultado');
  const pb = await b.ack('profile_op', { op: 'get' });
  ok(pb.ok && pb.profile.coins === startB - 200, `abandono online: B pagó su entrada (${startB} → ${pb.profile?.coins}) y no recibe premio`);
  a.s.close();
  b.s.close();
}

async function ops() {
  const g = await guest();
  let coins = g.profile.coins;
  const run = (op) => g.ack('profile_op', op);
  // Compra con monedas: Panela cuesta 3000 > 1000 iniciales → debe fallar sin descontar.
  const fail = await run({ op: 'buy', itemId: 'dice-panela' });
  ok(!fail.ok, 'tienda: no deja comprar sin monedas suficientes');
  const daily = await run({ op: 'daily' });
  if (daily.ok) {
    ok(daily.profile.coins > coins, `recompensa diaria suma monedas (${coins} → ${daily.profile.coins})`);
    coins = daily.profile.coins;
    const again = await run({ op: 'daily' });
    ok(!again.ok, 'recompensa diaria: no se reclama dos veces el mismo día');
  } else ok(false, `recompensa diaria: ${daily.error}`);
  g.s.close();
}

(async () => {
  try {
    await ops();
    await playAi('Barrio 4 jugadores', { table: 'barrio', players: 4, level: 'easy' });
    await playAi('Barrio 1 vs 1', { table: 'barrio', players: 2, level: 'easy' });
    await playAi('Barrio parejas', { table: 'barrio', players: 4, teams: true, level: 'easy' });
    await playAi('Barrio Modo Rápido', { table: 'barrio', players: 4, quick: true, level: 'easy' });
    await playAi('Práctica 6 jugadores', { table: 'barrio', players: 6, level: 'easy' });
    await playAi('Práctica sin apuesta', { table: null, players: 4, level: 'easy' });
    await playOnlinePair();
    await onlineResign();
  } catch (e) {
    fails.push(String(e));
    console.log('❌', e);
  }
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO CUADRA');
  process.exit(fails.length ? 1 : 0);
})();

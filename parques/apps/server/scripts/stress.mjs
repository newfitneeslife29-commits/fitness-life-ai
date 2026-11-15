/**
 * Prueba de estrés contra un servidor de desarrollo (no usar en producción).
 * Uso: PARQUES_TURN_MS=1500 PARQUES_BOT_MS=30 PARQUES_ADMIN_TOKEN=clave-admin-local-123 npm run dev:server
 *      node apps/server/scripts/stress.mjs
 * Jugadores automáticos juegan de verdad (tiran, eligen jugadas legales al azar, soplan, chatean, algunos se
 * van o se desconectan) en todos los modos y se comprueba que toda partida termina y el resultado llega una vez.
 */
import { io } from 'socket.io-client';
import { getLegalMoves, canSoplar } from '@parques/engine';

const URL = process.env.SERVER ?? 'http://localhost:3001';
const ADMIN = process.env.ADMIN ?? 'clave-admin-local-123';
const problems = [];
const bad = (m) => {
  problems.push(m);
  console.log('❌', m);
};

async function grant(id, coins) {
  await fetch(`${URL}/api/admin/grant`, { method: 'POST', headers: { 'x-admin-token': ADMIN, 'content-type': 'application/json' }, body: JSON.stringify({ id, coins, gems: 0 }) });
}

/** Un jugador automático. `quitAt`: tras cuántas acciones abandona (o null). */
async function bot(label, { quitAt = null, dropAt = null } = {}) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const ack = (ev, ...a) => new Promise((r) => s.emit(ev, ...a, r));
  await new Promise((r) => s.on('connect', r));
  const auth = await ack('auth', {});
  const me = { s, ack, id: auth.id, token: auth.token, label, seat: -1, state: null, results: 0, actions: 0, errors: [], done: false, left: false, roomId: null };
  await grant(me.id, 300000);
  const act = () => {
    const g = me.state;
    if (!g || me.left || g.phase === 'over') return;
    if (g.pendingSoplo && canSoplar(g, me.seat) === null && Math.random() < 0.5) {
      s.emit('action', { type: 'SOPLAR', player: me.seat }, (r) => r.ok || me.errors.push('soplar ' + r.error));
    }
    if (g.current !== me.seat) return;
    me.actions++;
    if (quitAt !== null && me.actions >= quitAt) {
      me.left = true;
      s.emit('leave');
      return;
    }
    if (dropAt !== null && me.actions === dropAt) {
      // Corte de red y reconexión con resume.
      s.disconnect();
      setTimeout(async () => {
        s.connect();
        await new Promise((r) => s.once('connect', r));
        await ack('auth', { id: me.id, token: me.token });
        const r = await ack('resume', me.roomId);
        if (!r.ok) me.errors.push('resume falló');
      }, 400);
      return;
    }
    const delay = 20 + Math.random() * 120;
    setTimeout(() => {
      const st = me.state;
      if (!st || st.current !== me.seat || st.phase === 'over') return;
      if (st.phase === 'roll') s.emit('action', { type: 'ROLL', player: me.seat }, (r) => r.ok || /Espera|turno|momento/.test(r.error) || me.errors.push('roll ' + r.error));
      else if (st.phase === 'move') {
        const moves = getLegalMoves(st);
        if (!moves.length) return;
        const m = moves[Math.floor(Math.random() * moves.length)];
        s.emit('action', { type: 'MOVE', player: me.seat, move: m }, (r) => r.ok || /turno|momento|ilegal/.test(r.error) || me.errors.push('move ' + r.error));
      }
      if (Math.random() < 0.03) s.emit('chat', 'jaja gonorrea qué suerte');
    }, delay);
  };
  s.on('sync', (m) => {
    me.seat = m.mySeat;
    me.state = m.state;
    me.roomId = m.room.roomId;
    act();
  });
  s.on('update', (m) => {
    me.state = m.state;
    if (m.state.phase === 'over') me.done = true;
    act();
  });
  s.on('match_result', () => {
    me.results++;
  });
  return me;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await wait(250);
  }
  bad(`${label}: no terminó en ${ms / 1000}s`);
  return false;
}

function check(label, players) {
  for (const p of players) {
    if (p.errors.length) bad(`${label} ${p.label}: errores ${[...new Set(p.errors)].slice(0, 3).join(' | ')}`);
    if (!p.left && p.results !== 1) bad(`${label} ${p.label}: resultados recibidos = ${p.results}`);
    if (p.left && p.results > 1) bad(`${label} ${p.label}: el que se fue recibió ${p.results} resultados`);
  }
  console.log(`✅ ${label} revisado`);
}

async function quick4(label, opts = []) {
  const ps = await Promise.all([0, 1, 2, 3].map((i) => bot(`${label}#${i}`, opts[i] ?? {})));
  for (const p of ps) await p.ack('quick_match', 'barrio');
  await until(() => ps.every((p) => p.left || p.results >= 1), 600000, label);
  await wait(1500);
  check(label, ps);
  ps.forEach((p) => p.s.close());
}

async function ai(label, o) {
  const p = await bot(label);
  const r = await p.ack('play_ai', o);
  if (!r.ok) return bad(`${label}: no empezó ${r.error}`);
  await until(() => p.results >= 1, 600000, label);
  await wait(1000);
  check(label, [p]);
  p.s.close();
}

async function privateTeams(label) {
  const ps = await Promise.all([0, 1, 2, 3].map((i) => bot(`${label}#${i}`)));
  const c = await ps[0].ack('create_private', { seats: 4, rules: { teams: true }, table: 'barrio' });
  if (!c.ok) return bad(`${label}: ${c.error}`);
  for (const p of ps.slice(1)) {
    const j = await p.ack('join_private', c.code);
    if (!j.ok) bad(`${label}: join ${j.error}`);
  }
  const st = await ps[0].ack('start_private');
  if (!st.ok) return bad(`${label}: start ${st.error}`);
  await until(() => ps.every((p) => p.results >= 1), 600000, label);
  await wait(1000);
  check(label, ps);
  ps.forEach((p) => p.s.close());
}

async function duo(label) {
  const ps = await Promise.all([0, 1, 2, 3].map((i) => bot(`${label}#${i}`)));
  for (const pair of [ps.slice(0, 2), ps.slice(2)]) {
    const c = await pair[0].ack('create_private', { seats: 4, rules: { teams: true }, table: 'barrio' });
    await pair[1].ack('join_private', c.code);
    await wait(200);
    const r = await pair[0].ack('duo_match');
    if (!r.ok) bad(`${label}: duo ${r.error}`);
  }
  await until(() => ps.every((p) => p.results >= 1), 600000, label);
  await wait(1000);
  check(label, ps);
  // Las dos parejas deben quedar en la misma mesa, compañeros enfrente.
  if (ps[0].roomId !== ps[2].roomId) bad(`${label}: las parejas no quedaron juntas`);
  if (Math.abs(ps[0].seat - ps[1].seat) !== 2) bad(`${label}: compañeros no quedaron enfrente`);
  ps.forEach((p) => p.s.close());
}

async function flash(label, n) {
  const ps = await Promise.all(Array.from({ length: n }, (_, i) => bot(`${label}#${i}`)));
  const done = new Set();
  for (const p of ps) p.s.on('flash', (m) => m.bracket?.stage === 'done' && done.add(p.id));
  for (const p of ps) {
    const r = await p.ack('flash_join');
    if (!r.ok) bad(`${label}: ${r.error}`);
  }
  await until(() => done.size === n, 900000, label);
  await wait(1500);
  for (const p of ps) if (p.errors.length) bad(`${label} ${p.label}: ${p.errors.slice(0, 2).join(' | ')}`);
  console.log(`✅ ${label} revisado (${n} jugadores)`);
  ps.forEach((p) => p.s.close());
}

const t0 = Date.now();
await Promise.all([
  quick4('online4'),
  quick4('online4-abandono', [{ quitAt: 6 }, {}, { quitAt: 15 }, {}]),
  quick4('online4-corte', [{ dropAt: 5 }, {}, {}, {}]),
  ai('ia-4', { table: 'barrio', players: 4 }),
  ai('ia-2', { table: 'ciudad', players: 2 }),
  ai('ia-6', { table: 'barrio', players: 6 }),
  ai('ia-parejas', { table: 'barrio', players: 4, teams: true }),
  ai('ia-rapido', { table: 'barrio', players: 4, quick: true }),
  ai('reto', { table: 'barrio', players: 4, challenge: true }),
  ai('historia', { table: 'barrio', players: 4, story: 0 }),
  privateTeams('privada-parejas'),
  duo('2vs2'),
  flash('relampago', 6),
]);
console.log(`\nTerminado en ${Math.round((Date.now() - t0) / 1000)} s. Problemas: ${problems.length}`);
process.exit(problems.length ? 1 : 0);

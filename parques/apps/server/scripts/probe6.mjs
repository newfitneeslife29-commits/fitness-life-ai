import { io } from 'socket.io-client';
const s = io('http://localhost:3001', { transports: ['websocket'] });
const ack = (ev, ...a) => new Promise((r) => s.emit(ev, ...a, r));
let n = 0;
let last = null;
s.on('update', (m) => {
  n++;
  last = m.state;
});
s.on('sync', (m) => {
  last = m.state;
});
s.on('match_result', () => {
  console.log('RESULT after updates', n);
  process.exit(0);
});
s.on('notice', (m) => console.log('notice', m.text));
(async () => {
  await ack('auth', {});
  console.log('play', await ack('play_ai', { table: 'barrio', players: 6, level: 'easy' }));
  setInterval(() => {
    console.log('updates', n, 'phase', last?.phase, 'current', last?.current, 'turn', last?.turn, 'ranking', last?.ranking);
  }, 10000);
  setTimeout(() => process.exit(1), 300000);
})();

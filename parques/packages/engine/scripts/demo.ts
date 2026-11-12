/**
 * Demo en consola: 4 bots juegan una partida completa y se narra cada evento.
 * Uso: npm run demo            (semilla aleatoria)
 *      npm run demo -- 1234    (semilla fija)
 */
import { applyAction, autoAction, createGame, shouldSoplar } from '../src';
import type { AiLevel, GameEvent, GameState } from '../src';

const seed = Number(process.argv[2] ?? Math.floor(Math.random() * 1e6));
const levels: AiLevel[] = ['expert', 'normal', 'easy', 'normal'];
let state = createGame({
  sides: 4,
  seed,
  players: [
    { name: 'Amarillo (Experto)', side: 0, isBot: true },
    { name: 'Rojo (Normal)', side: 1, isBot: true },
    { name: 'Verde (Fácil)', side: 2, isBot: true },
    { name: 'Azul (Normal)', side: 3, isBot: true },
  ],
});

const name = (s: GameState, i: number) => s.players[i]!.name;
function narrate(s: GameState, e: GameEvent): string | null {
  switch (e.type) {
    case 'ROLLED': return `🎲 ${name(s, e.player)} saca ${e.dice[0]}-${e.dice[1]}${e.pair ? `  ¡PAR! (${e.pairStreak} seguidos)` : ''}`;
    case 'EXITED_JAIL': return `🔓 ${name(s, e.player)} saca ${e.pieces.length} ficha(s) de la cárcel`;
    case 'CAPTURED': return `💥 ¡Uy, qué boleta! ${name(s, e.by.owner)} captura ${e.victims.length} ficha(s) de ${name(s, e.victims[0]!.owner)}`;
    case 'CROWNED': return `👑 ${name(s, e.piece.owner)} corona una ficha`;
    case 'TRIPLE_PAIR': return `🚨 ¡Tres pares! ${name(s, e.player)} manda su ficha más adelantada a la cárcel`;
    case 'SOPLADO': return `🌬️  ¡Lo soplé! ${name(s, e.by)} sopla a ${name(s, e.offender)}`;
    case 'PLAYER_FINISHED': return `🏁 ${name(s, e.player)} termina en el puesto ${e.place}`;
    case 'GAME_OVER': return `🎉 Fin. Podio: ${e.ranking.map((i, k) => `${k + 1}º ${name(s, i)}`).join(' · ')}`;
    default: return null;
  }
}

console.log(`Parqués — demo de motor (semilla ${seed})\n`);
let actions = 0;
while (state.phase !== 'over' && actions < 20000) {
  actions++;
  let action = autoAction(state, levels[state.current]);
  if (state.pendingSoplo) {
    const who = state.players.findIndex((_, i) => shouldSoplar(state, i, levels[i]));
    if (who >= 0) action = { type: 'SOPLAR', player: who };
  }
  if (!action) break;
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(r.error);
  state = r.state;
  for (const e of r.events) {
    const line = narrate(state, e);
    if (line && e.type !== 'ROLLED') console.log(line);
  }
}
console.log(`\n${actions} acciones · ${state.turn} turnos`);
for (const p of state.players) {
  console.log(`  ${p.name.padEnd(20)} capturas ${p.stats.captures}  pares ${p.stats.pairs}  soplos ${p.stats.soplosHechos}`);
}

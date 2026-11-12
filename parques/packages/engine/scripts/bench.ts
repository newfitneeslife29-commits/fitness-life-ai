import { simulate } from '../test/sim';
const t0 = performance.now();
let wins = 0; let actions = 0;
const N = 100;
for (let seed = 1; seed <= N; seed++) {
  const expertSide = seed % 2 === 0 ? 0 : 2;
  const r = simulate({ sides: 4, players: [{ name: 'E', side: expertSide }, { name: 'F', side: 2 - expertSide }] },
    expertSide === 0 ? ['expert', 'normal'] : ['normal', 'expert'], seed);
  actions += r.actions;
  if (r.state.players[r.state.ranking[0]!]!.name === 'E') wins++;
}
console.log(`Experto vs Normal: ${wins}/${N}; ${(actions / N).toFixed(0)} acciones/partida; ${((performance.now() - t0) / actions).toFixed(2)} ms/acción`);

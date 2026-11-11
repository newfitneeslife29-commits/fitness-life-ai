import { COLORS_4, COLORS_6, DEFAULT_RULES, JAIL } from './types';
import type { GameConfig, GameState, HouseRules, PlayerState } from './types';
import { randomSeed } from './rng';

export function emptyStats(): PlayerState['stats'] {
  return { captures: 0, captured: 0, crowned: 0, pairs: 0, soplosHechos: 0, soplosRecibidos: 0, tripleParCastigos: 0 };
}

export function resolveRules(rules?: Partial<HouseRules>): HouseRules {
  const r = { ...DEFAULT_RULES, ...rules };
  r.jailAttempts = Math.max(1, Math.min(3, Math.round(r.jailAttempts)));
  r.piecesPerPlayer = Math.max(1, Math.min(4, Math.round(r.piecesPerPlayer)));
  r.exitCount = Math.max(1, Math.min(4, Math.round(r.exitCount)));
  return r;
}

/** Crea una partida nueva. Los jugadores se ordenan por lado (orden de turnos). */
export function createGame(config: GameConfig): GameState {
  const { sides } = config;
  if (sides !== 4 && sides !== 6) throw new Error('El tablero debe tener 4 o 6 lados');
  const rules = resolveRules(config.rules);
  const setups = [...config.players].sort((a, b) => a.side - b.side);
  if (setups.length < 2 || setups.length > sides) throw new Error(`Se necesitan entre 2 y ${sides} jugadores`);
  const usedSides = new Set<number>();
  for (const p of setups) {
    if (!Number.isInteger(p.side) || p.side < 0 || p.side >= sides) throw new Error(`Lado inválido: ${p.side}`);
    if (usedSides.has(p.side)) throw new Error(`Lado repetido: ${p.side}`);
    usedSides.add(p.side);
  }
  if (rules.teams) {
    const half = sides / 2;
    for (const p of setups) {
      if (!usedSides.has((p.side + half) % sides)) throw new Error('En parejas cada jugador necesita compañero en el lado opuesto');
    }
  }
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const players: PlayerState[] = setups.map((p) => ({
    name: p.name,
    side: p.side,
    color: colors[p.side]!,
    isBot: !!p.isBot,
    team: rules.teams ? p.side % (sides / 2) : null,
    pieces: Array.from({ length: rules.piecesPerPlayer }, () => JAIL),
    finished: false,
    stats: emptyStats(),
  }));
  return {
    sides,
    rules,
    players,
    current: 0,
    phase: 'roll',
    dice: null,
    diceUsed: [false, false],
    pairStreak: 0,
    jailRollsUsed: 0,
    rng: (config.seed ?? randomSeed()) >>> 0,
    missedCapture: null,
    capturedThisRoll: false,
    pendingSoplo: null,
    ranking: [],
    turn: 1,
    version: 0,
  };
}

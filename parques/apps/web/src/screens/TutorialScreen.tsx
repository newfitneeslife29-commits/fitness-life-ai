import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { applyAction, createGame, getLegalMoves, item, DEFAULT_EQUIPPED } from '@parques/engine';
import type { GameState, Move, PieceRef } from '@parques/engine';
import { Board } from '../game/Board';
import { Dice } from '../game/Dice';
import { piecePoint } from '../game/boardLayout';
import { Mascot } from '../components/Mascot';
import { Background } from '../components/Background';
import { useApp } from '../stores/appStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { TUTORIAL_STEPS as STEPS } from '../game/tutorialData';

export const TUTORIAL_KEY = 'parques-tutorial-done';
export const TOUR_KEY = 'parques-tour-pending';

export function tutorialDone(): boolean {
  try {
    return !!localStorage.getItem(TUTORIAL_KEY);
  } catch {
    return true;
  }
}

function mark(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* sin almacenamiento */
  }
}


/** Busca dónde poner la ficha verde para que 2+3 la capture (siempre con el motor, nunca a mano). */
function withVictim(g: GameState): GameState {
  for (let p = 0; p < 60; p++) {
    const test = structuredClone(g);
    test.players[1]!.pieces = [p, -1, -1, -1];
    const r = applyAction(test, { type: 'ROLL', player: 0, dice: [2, 3] });
    if (!r.ok) continue;
    for (const m of getLegalMoves(r.state)) {
      if (m.type !== 'sum') continue;
      const after = applyAction(r.state, { type: 'MOVE', player: 0, move: m });
      if (after.ok && after.events.some((e) => e.type === 'CAPTURED')) return test;
    }
  }
  return g;
}

/** Partida de práctica guiada paso a paso, y luego el recorrido por la interfaz del inicio. */
export function TutorialScreen() {
  const t = useT();
  const go = useApp((a) => a.go);
  const [game, setGame] = useState<GameState>(() =>
    createGame({ sides: 4, seed: 7, players: [{ name: 'Tú', side: 0 }, { name: 'Dadito', side: 2, isBot: true }] }),
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [selected, setSelected] = useState<PieceRef | null>(null);
  const [done, setDone] = useState(false);
  const step = STEPS[stepIdx]!;

  const theme = item(DEFAULT_EQUIPPED.board).board!;
  const pieceStyle = item(DEFAULT_EQUIPPED.pieces).pieces!;
  const effect = item(DEFAULT_EQUIPPED.effect).effect!;
  const diceSkin = item(DEFAULT_EQUIPPED.dice).dice!;

  const legal = useMemo(() => (game.phase === 'move' && game.current === 0 ? getLegalMoves(game) : []), [game]);
  const exitMoves = step.wait === 'exit' ? legal.filter((m): m is Extract<Move, { type: 'exit' }> => m.type === 'exit') : [];
  const movable = useMemo(() => {
    const s = new Set<string>();
    if (step.wait === 'move' || step.wait === 'capture')
      for (const m of legal) if (m.type !== 'exit' && (step.wait === 'move' || m.type === 'sum')) s.add(`${m.piece.owner}-${m.piece.index}`);
    return s;
  }, [legal, step.wait]);
  const view = game.players.map((p) => [...p.pieces]);

  const targets = useMemo(() => {
    if (!selected || !game.dice) return [];
    const dice = game.dice;
    const pos = game.players[selected.owner]!.pieces[selected.index]!;
    const side = game.players[selected.owner]!.side;
    return legal
      .filter((m) => m.type !== 'exit' && m.piece.owner === selected.owner && m.piece.index === selected.index)
      .filter((m) => step.wait !== 'capture' || m.type === 'sum')
      .map((m) => {
        const mv = m as Exclude<Move, { type: 'exit' }>;
        const value = mv.type === 'sum' ? dice[0] + dice[1] : dice[mv.die];
        return { move: m, at: piecePoint(game.sides, side, pos + value, selected.index), label: mv.type === 'sum' ? `${dice[0]}+${dice[1]}` : String(value) };
      });
  }, [selected, game, legal, step.wait]);

  const advance = (g: GameState) => {
    // Avanza al siguiente paso que tenga sentido con el estado actual del tablero.
    let next = stepIdx + 1;
    if (STEPS[next]?.wait === 'move' && !(g.phase === 'move' && g.current === 0)) next++;
    if (STEPS[next]?.dice && STEPS[next]!.dice![0] === 2) g = withVictim(g);
    setGame(g);
    setSelected(null);
    if (next >= STEPS.length) {
      play('win');
      setDone(true);
    } else setStepIdx(next);
  };

  const doRoll = () => {
    if (step.wait !== 'roll' || rolling) return;
    play('roll');
    setRolling(true);
    setTimeout(() => {
      const r = applyAction(game, { type: 'ROLL', player: 0, dice: step.dice });
      setRolling(false);
      if (!r.ok) return;
      if (r.state.dice?.[0] === r.state.dice?.[1]) play('pair');
      setGame(r.state);
      setStepIdx((i) => i + 1);
    }, 700);
  };

  const doMove = (m: Move) => {
    const r = applyAction(game, { type: 'MOVE', player: 0, move: m });
    if (!r.ok) return;
    if (r.events.some((e) => e.type === 'CAPTURED')) play('capture');
    else if (m.type === 'exit') play('exit');
    else play('step');
    // Si aún queda un dado por mover en el paso de mover, se espera otra jugada.
    if (step.wait === 'move' && r.state.phase === 'move' && r.state.current === 0) {
      setGame(r.state);
      setSelected(null);
      return;
    }
    advance(r.state);
  };

  const onPiece = (ref: PieceRef) => {
    if (!movable.has(`${ref.owner}-${ref.index}`)) return;
    play('tap');
    setSelected(ref);
  };

  const finish = () => {
    mark(TUTORIAL_KEY, '1');
    mark(TOUR_KEY, '1');
    go('lobby');
  };

  return (
    <div className="screen tutorial-screen">
      <Background />
      <div className="tut-top">
        <span className="tut-progress">
          {t('Lección')} {Math.min(stepIdx + 1, STEPS.length)}/{STEPS.length}
        </span>
        <button className="link-btn" onClick={finish}>
          {t('Saltar')} ›
        </button>
      </div>
      <div className="tut-bar">
        <motion.span className="tut-bar-fill" animate={{ width: `${((done ? STEPS.length : stepIdx) / STEPS.length) * 100}%` }} />
      </div>
      <motion.div className="tut-board" initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
        <Board
          game={game}
          view={view}
          viewSide={0}
          movable={movable}
          selected={selected}
          targets={targets}
          fx={[]}
          onPiece={onPiece}
          onTarget={doMove}
          theme={theme}
          pieceStyle={pieceStyle}
          effect={effect}
        />
        <AnimatePresence>
          {exitMoves.length ? (
            <motion.div className="exit-choices" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              {exitMoves.map((m) => (
                <motion.button key={m.count} className="btn3d green small" whileTap={{ scale: 0.9 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1, repeat: Infinity }} onClick={() => doMove(m)}>
                  🔓 {t('Sacar {n}', { n: m.count })}
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={done ? 'done' : stepIdx} className="tut-coach card glossy" initial={{ y: 40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <Mascot size={done ? 96 : 76} mood={done ? 'gana' : 'hola'} className="tut-mascot" />
          <div className="tut-text">
            <p>{done ? t('¡Ya sabes jugar, parce! Ahora te muestro la app para que la conozcas.') : t(step.text)}</p>
            {done ? (
              <button className="btn3d play-btn wide shine" onClick={finish}>
                ▶ {t('¡Vamos!')}
              </button>
            ) : step.wait === 'next' ? (
              <button className="btn3d green small" onClick={() => { play('tap'); advance(game); }}>
                {t('Siguiente')} ›
              </button>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="tut-dice">
        <Dice dice={game.dice} used={game.diceUsed} rolling={rolling} canRoll={step.wait === 'roll' && !done} tint="var(--amarillo)" skin={diceSkin} onRoll={doRoll} />
      </div>
    </div>
  );
}

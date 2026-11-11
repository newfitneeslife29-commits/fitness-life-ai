import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { homeFor, isActive } from '@parques/engine';
import type { Move, PieceRef } from '@parques/engine';
import { Board } from '../game/Board';
import { Dice } from '../game/Dice';
import { PlayerSeat } from '../game/PlayerSeat';
import { PairCounter } from '../game/PairCounter';
import { Banner } from '../game/Banner';
import { boardBox, jailGeom, piecePoint, viewRotation } from '../game/boardLayout';
import { CHAT_PHRASES, REACTIONS } from '../game/phrases';
import { humanSeat, legalMovesCache, SOPLO_WINDOW_MS, useGame } from '../stores/gameStore';
import { useApp } from '../stores/appStore';
import { useLevel, useProfile } from '../stores/profileStore';
import { item } from '../meta/catalog';
import { Background } from '../components/Background';
import { play } from '../audio/audio';
import { useSettings } from '../stores/settingsStore';
import { Toggle } from './SettingsScreen';

const LEVEL_LABEL = { easy: 'Fácil', normal: 'Normal', expert: 'Experto' } as const;

export function GameScreen() {
  const s = useGame();
  const go = useApp((a) => a.go);
  const { game, config, view } = s;
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, tick] = useState(0);
  const equipped = useProfile((p) => p.equipped);
  const theme = item(equipped.board).board!;
  const diceSkin = item(equipped.dice).dice!;
  const pieceStyle = item(equipped.pieces).pieces!;
  const effect = item(equipped.effect).effect!;
  const myFrame = equipped.frame;
  const settings = useSettings();
  const myLevel = useLevel().level;

  // Reloj para contadores (Modo Rápido y soplo).
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Al terminar, pasa a la pantalla de victoria.
  useEffect(() => {
    if (game?.phase === 'over' && !s.busy) {
      const t = setTimeout(() => go('victory'), 1200);
      return () => clearTimeout(t);
    }
  }, [game?.phase, s.busy, go]);

  const humanTurn = !!game && humanSeat(config, game, game.current) && !s.busy && game.phase !== 'over';
  const legal = useMemo(() => (humanTurn && game && game.phase === 'move' ? legalMovesCache(game) : []), [humanTurn, game]);

  const movable = useMemo(() => {
    const set = new Set<string>();
    for (const m of legal) if (m.type !== 'exit') set.add(`${m.piece.owner}-${m.piece.index}`);
    return set;
  }, [legal]);

  const exitMoves = legal.filter((m): m is Extract<Move, { type: 'exit' }> => m.type === 'exit');

  const targets = useMemo(() => {
    if (!game || !s.selected) return [];
    const sel = s.selected;
    const dice = game.dice!;
    const pos = view[sel.owner]![sel.index]!;
    const side = game.players[sel.owner]!.side;
    return legal
      .filter((m) => m.type !== 'exit' && m.piece.owner === sel.owner && m.piece.index === sel.index)
      .map((m) => {
        const mv = m as Exclude<Move, { type: 'exit' }>;
        const value = mv.type === 'sum' ? dice[0] + dice[1] : dice[mv.die];
        return { move: m, at: piecePoint(game.sides, side, pos + value, sel.index), label: mv.type === 'sum' ? `${dice[0]}+${dice[1]}` : String(value) };
      });
  }, [game, s.selected, legal, view]);

  if (!game || !config) return null;

  const home = homeFor(game.sides);
  const current = game.players[game.current]!;
  const seatCfg = (side: number) => config.seats.find((x) => x.side === side)!;

  // Ubicación de cada jugador alrededor del tablero según dónde queda su cárcel en pantalla.
  const rotDeg = viewRotation(game.sides, s.viewSide);
  const placed = game.players.map((p, i) => {
    const j = jailGeom(game.sides, p.side).center;
    const t = (rotDeg * Math.PI) / 180;
    const x = j.x * Math.cos(t) - j.y * Math.sin(t);
    const y = j.x * Math.sin(t) + j.y * Math.cos(t);
    const top = y < -1 || (Math.abs(y) <= 1 && x < 0);
    return { i, x, top };
  });
  const topRow = placed.filter((p) => p.top).sort((a, b) => a.x - b.x);
  const bottomRow = placed.filter((p) => !p.top).sort((a, b) => a.x - b.x);

  const renderSeat = (i: number, align: 'left' | 'right' | 'center') => {
    const p = game.players[i]!;
    const cfg = seatCfg(p.side);
    const place = game.ranking.indexOf(i);
    return (
      <PlayerSeat
        key={i}
        player={p}
        avatar={cfg.avatar}
        active={game.current === i && game.phase !== 'over'}
        isBot={cfg.kind === 'bot'}
        tag={cfg.kind === 'bot' ? '🤖' : cfg.kind === 'remote' ? '🌐' : `Nv ${myLevel}`}
        frameId={cfg.kind === 'human' ? myFrame : undefined}
        level={cfg.kind === 'bot' ? LEVEL_LABEL[cfg.level] : undefined}
        place={place >= 0 && (p.finished || game.phase === 'over') ? place + 1 : null}
        crowned={view[i]!.filter((x) => x === home).length}
        deadline={game.current === i ? s.turnDeadline : null}
        totalMs={(config.turnSeconds * 1000) / s.speed}
        bubble={s.bubbles[i]}
        align={align}
        team={p.team}
      />
    );
  };
  const alignFor = (k: number, n: number, x = 0) => (n === 1 ? (x > 0 ? 'right' : 'left') : k === 0 ? 'left' : k === n - 1 ? 'right' : 'center');

  const onPiece = (ref: PieceRef) => {
    if (s.selected && s.selected.owner === ref.owner && s.selected.index === ref.index) {
      // Segundo toque: si solo hay un destino, mueve directo.
      if (targets.length === 1) s.humanMove(targets[0]!.move);
      return;
    }
    s.select(ref);
  };

  const soplo = game.pendingSoplo;
  const humanCanSoplar =
    !!soplo &&
    game.players.some((_, i) => humanSeat(config, game, i) && i !== soplo.offender && (game.players[i]!.team === null || game.players[i]!.team !== game.players[soplo.offender]!.team));
  const soploLeft = s.soploDeadline ? Math.max(0, s.soploDeadline - Date.now()) : 0;
  const matchLeft = s.matchDeadline ? Math.max(0, s.matchDeadline - Date.now()) : null;

  const rollerIsHuman = humanSeat(config, game, game.current);
  const status = (() => {
    if (game.phase === 'over') return '¡Partida terminada!';
    const who = rollerIsHuman ? (config.seats.filter((x) => x.kind === 'human').length > 1 ? current.name : 'Tú') : current.name;
    if (game.phase === 'roll') {
      const inPlay = current.pieces.some((p) => isActive(game.sides, p));
      const tries = !inPlay ? ` · intento ${game.jailRollsUsed + 1}/${game.rules.jailAttempts}` : '';
      return `${who}: tira los dados${tries}`;
    }
    if (exitMoves.length > 0 && movable.size === 0) return `${who}: ¿cuántas sacas de la cárcel?`;
    return `${who}: mueve una ficha`;
  })();

  return (
    <div className="screen game-screen">
      <Background tint={theme.page} />
      <header className="game-top">
        <button className="btn3d ghost icon" onClick={() => { setMenuOpen(true); s.setPaused(true); play('tap'); }} aria-label="Menú">
          ☰
        </button>
        <div className="game-status" style={{ ['--pc' as string]: `var(--${current.color})` }}>
          <span className="status-dot" />
          {status}
        </div>
        {matchLeft !== null ? (
          <div className={`chip match-clock ${matchLeft < 30000 ? 'hurry' : ''}`}>⏱ {fmt(matchLeft * s.speed)}</div>
        ) : (
          <button className="btn3d ghost icon" onClick={() => setChatOpen((o) => !o)} aria-label="Chat">
            💬
          </button>
        )}
      </header>

      <div className="seat-row">{topRow.map((p, k) => renderSeat(p.i, alignFor(k, topRow.length, p.x)))}</div>

      <div className="board-wrap">
        <div className="board-tilt" style={{ ['--ar' as string]: `${boardBox(game.sides).w / boardBox(game.sides).h}` }}>
          <Board
            game={game}
            view={view}
            viewSide={s.viewSide}
            movable={movable}
            selected={s.selected}
            targets={targets}
            fx={s.fx}
            onPiece={onPiece}
            onTarget={(m) => s.humanMove(m)}
            theme={theme}
            pieceStyle={pieceStyle}
            effect={effect}
          />
        </div>
        <Banner banner={s.banner} />
        <AnimatePresence>
          {exitMoves.length > 0 ? (
            <motion.div className="exit-choices" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
              {exitMoves.map((m) => (
                <motion.button key={m.count} className="btn3d green small" whileTap={{ scale: 0.9 }} onClick={() => s.humanMove(m)}>
                  🔓 Sacar {m.count > 2 ? `todas (${m.count})` : m.count}
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="seat-row bottom">{bottomRow.map((p, k) => renderSeat(p.i, alignFor(k, bottomRow.length, p.x)))}</div>

      <div className="control-bar">
        <PairCounter streak={game.pairStreak} penalty={game.rules.triplePairPenalty} />
        <Dice
          dice={s.shownDice}
          used={game.diceUsed}
          rolling={s.rolling}
          canRoll={humanTurn && game.phase === 'roll'}
          tint={`var(--${current.color})`}
          onRoll={s.humanRoll}
          skin={diceSkin}
        />
        <div className="side-actions">
          {matchLeft !== null ? (
            <button className="btn3d ghost icon" onClick={() => setChatOpen((o) => !o)} aria-label="Chat">
              💬
            </button>
          ) : null}
        </div>
      </div>


      <AnimatePresence>
        {soplo && humanCanSoplar ? (
          <motion.button
            className="soplar-btn"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [1, 1.08, 1], rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ scale: { duration: 0.6, repeat: Infinity } }}
            onClick={s.humanSoplar}
          >
            <span>🌬️ ¡Soplar!</span>
            <svg viewBox="0 0 100 8" className="soplar-bar">
              <rect width={100} height={8} rx={4} fill="rgba(0,0,0,.25)" />
              <rect width={(soploLeft / (SOPLO_WINDOW_MS / s.speed)) * 100} height={8} rx={4} fill="#fff" />
            </svg>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen ? (
          <motion.div className="chat-panel card" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
            <div className="chat-reactions">
              {REACTIONS.map((r) => (
                <button key={r} onClick={() => { s.chat(r); setChatOpen(false); }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="chat-phrases">
              {CHAT_PHRASES.map((p) => (
                <button key={p} onClick={() => { s.chat(p); setChatOpen(false); }}>
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <h2>{s.online ? 'Menú' : 'Pausa'}</h2>
              <p className="modal-text">Reglas de esta mesa: {describeRules(game.rules)}</p>
              <Toggle label="🔈 Sonido" value={settings.sound} onChange={(v) => settings.set({ sound: v })} />
              <Toggle label="🎵 Música" value={settings.music} onChange={(v) => settings.set({ music: v })} />
              <Toggle label="📳 Vibración" value={settings.vibration} onChange={(v) => settings.set({ vibration: v })} />
              <button className="btn3d green" onClick={() => { setMenuOpen(false); s.setPaused(false); }}>
                Seguir jugando
              </button>
              <button className="btn3d red" onClick={() => { setMenuOpen(false); s.quit(); go('lobby'); }}>
                Salir de la partida
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function fmt(ms: number): string {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function describeRules(r: { soplar: boolean; triplePairPenalty: boolean; jailAttempts: number; teams: boolean; piecesPerPlayer: number }): string {
  return [
    r.soplar ? 'soplar sí' : 'sin soplar',
    r.triplePairPenalty ? 'tres pares a la cárcel' : 'sin castigo de tres pares',
    `${r.jailAttempts} intento(s) para salir`,
    r.teams ? 'parejas' : null,
    `${r.piecesPerPlayer} fichas`,
  ]
    .filter(Boolean)
    .join(' · ');
}

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLORS_4, COLORS_6, homeFor, SQUARES_PER_SIDE, trackLength } from '@parques/engine';
import type { Color, GameState, Move, PieceRef } from '@parques/engine';
import {
  armCell,
  boardBox,
  corridorCell,
  jailGeom,
  llegadaCell,
  outlinePoints,
  params,
  pieceCell,
  piecePoint,
  skyRadius,
  stackOffset,
  trackCell,
  viewRotation,
  type Cell,
  type Pt,
} from './boardLayout';
import { Piece } from './Piece';
import { FxLayer } from './Effects';
import type { Fx } from '../stores/gameStore';

interface Props {
  game: GameState;
  view: number[][];
  viewSide: number;
  movable: Set<string>;
  selected: PieceRef | null;
  targets: { move: Move; at: Pt; label: string }[];
  fx: Fx[];
  onPiece: (ref: PieceRef) => void;
  onTarget: (move: Move) => void;
}

const c = (color: Color) => `var(--${color})`;
const cd = (color: Color) => `var(--${color}-dark)`;
const tint = (color: Color, pct: number) => `color-mix(in srgb, ${c(color)} ${pct}%, white)`;
const LINE = '#13254f';

function Label({ cell, text, font }: { cell: Cell; text: string; font: number }) {
  return (
    <text
      x={cell.center.x}
      y={cell.center.y}
      transform={`rotate(${cell.angle} ${cell.center.x} ${cell.center.y})`}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'Baloo 2', Nunito, sans-serif"
      fontWeight={800}
      fontSize={font}
      letterSpacing={0.5}
      fill="#fff"
      stroke="rgba(0,0,0,.45)"
      strokeWidth={3}
      paintOrder="stroke"
      pointerEvents="none"
    >
      {text}
    </text>
  );
}

/** Casilla de color con efecto 3D (franja clara arriba). */
function SolidCell({ cell, color }: { cell: Cell; color: Color }) {
  return (
    <g>
      <polygon points={cell.points} fill={c(color)} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={cell.points} fill="url(#cellGloss)" pointerEvents="none" />
    </g>
  );
}

/** Capa estática del tablero (memoizada: no cambia durante la partida). */
const BoardBase = memo(function BoardBase({ sides, active }: { sides: 4 | 6; active: boolean[] }) {
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const len = trackLength(sides);
  const { font } = params(sides);
  const sky = skyRadius(sides);

  return (
    <g>
      {/* Marco */}
      <polygon points={outlinePoints(sides, 16)} fill="#0d2f80" stroke="#071a4d" strokeWidth={10} strokeLinejoin="round" />
      <polygon points={outlinePoints(sides, 2)} fill="url(#skyBg)" stroke="#0a2466" strokeWidth={4} strokeLinejoin="round" />

      {/* Cielo */}
      <circle r={sky + 10} fill="#0d2f80" opacity={0.25} />
      <circle r={sky} fill="url(#skyCircle)" stroke="#fff" strokeWidth={6} />
      <g pointerEvents="none">
        <Cloud x={-sky * 0.45} y={-sky * 0.5} s={sky / 120} />
        <Cloud x={sky * 0.35} y={-sky * 0.25} s={sky / 140} />
        <Cloud x={-sky * 0.3} y={sky * 0.2} s={sky / 110} />
        <Cloud x={sky * 0.4} y={sky * 0.55} s={sky / 150} />
      </g>

      {/* Cárceles */}
      {colors.map((color, side) => {
        const j = jailGeom(sides, side);
        const u = j.axis;
        const v = { x: -u.y, y: u.x };
        const span = sides === 4 ? 190 : 130;
        return (
          <g key={`jail-${side}`} opacity={active[side] ? 1 : 0.4}>
            <clipPath id={`jail-clip-${sides}-${side}`}>
              <polygon points={j.points} />
            </clipPath>
            <polygon points={j.points} fill={c(color)} />
            <polygon points={j.points} fill="url(#jailGloss)" pointerEvents="none" />
            <g clipPath={`url(#jail-clip-${sides}-${side})`}>
            {/* Candado */}
            <g transform={`translate(${j.center.x} ${j.center.y})`} opacity={0.35}>
              <rect x={-34} y={-14} width={68} height={52} rx={10} fill={cd(color)} />
              <path d="M-20 -14 V-30 A20 20 0 0 1 20 -30 V-14" fill="none" stroke={cd(color)} strokeWidth={10} />
            </g>
            {/* Rejas diagonales */}
            {[-2, -1, 0, 1, 2].map((k) => {
              const o = k * (sides === 4 ? 44 : 32);
              const a = { x: j.center.x + v.x * o - u.x * span * (1 - Math.abs(k) * 0.18), y: j.center.y + v.y * o - u.y * span * (1 - Math.abs(k) * 0.18) };
              const b = { x: j.center.x + v.x * o + u.x * span * (1 - Math.abs(k) * 0.18), y: j.center.y + v.y * o + u.y * span * (1 - Math.abs(k) * 0.18) };
              return (
                <g key={k}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cd(color)} strokeWidth={13} strokeLinecap="round" />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,.35)" strokeWidth={4} strokeLinecap="round" />
                </g>
              );
            })}
            </g>
            <polygon points={j.points} fill="none" stroke={LINE} strokeWidth={6} strokeLinejoin="round" />
          </g>
        );
      })}

      {/* Recorrido: casillas claras teñidas del color de cada tramo, SALIDA y SEGURO de color */}
      {Array.from({ length: len }, (_, sq) => {
        const cell = trackCell(sides, sq);
        const side = Math.floor(sq / SQUARES_PER_SIDE);
        const o = sq % SQUARES_PER_SIDE;
        const color = colors[side]!;
        if (o === 0 || o === 5 || o === 12) {
          return (
            <g key={`sq-${sq}`}>
              <SolidCell cell={cell} color={color} />
              <Label cell={cell} text={o === 5 ? 'SALIDA' : 'SEGURO'} font={font} />
            </g>
          );
        }
        return <polygon key={`sq-${sq}`} points={cell.points} fill={tint(color, 16)} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />;
      })}

      {/* Pasillos y llegada */}
      {colors.map((color, side) => (
        <g key={`cor-${side}`} opacity={active[side] ? 1 : 0.55}>
          {Array.from({ length: 7 }, (_, i) => (
            <SolidCell key={i} cell={corridorCell(sides, side, i + 1)} color={color} />
          ))}
          <SolidCell cell={llegadaCell(sides, side)} color={color} />
          <Label cell={llegadaCell(sides, side)} text="LLEGADA" font={font} />
        </g>
      ))}

    </g>
  );
});

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
      <ellipse cx={0} cy={6} rx={34} ry={13} fill="#fff" />
      <circle cx={-14} cy={0} r={13} fill="#fff" />
      <circle cx={6} cy={-6} r={17} fill="#fff" />
      <circle cx={22} cy={2} r={11} fill="#fff" />
      <ellipse cx={0} cy={14} rx={30} ry={5} fill="#cfe8fb" />
    </g>
  );
}

export function BoardDefs() {
  return (
    <defs>
      <radialGradient id="skyBg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#bfe6ff" />
        <stop offset="60%" stopColor="#5fb4f2" />
        <stop offset="100%" stopColor="#2f86e0" />
      </radialGradient>
      <radialGradient id="skyCircle" cx="45%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#8fd3ff" />
        <stop offset="100%" stopColor="#1e88e5" />
      </radialGradient>
      <linearGradient id="cellGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,.35)" />
        <stop offset="45%" stopColor="rgba(255,255,255,.05)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.12)" />
      </linearGradient>
      <radialGradient id="jailGloss" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="rgba(255,255,255,.45)" />
        <stop offset="50%" stopColor="rgba(255,255,255,.05)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.25)" />
      </radialGradient>
      <radialGradient id="pieceShine" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
        <stop offset="35%" stopColor="rgba(255,255,255,.25)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
  );
}

export function Board({ game, view, viewSide, movable, selected, targets, fx, onPiece, onTarget }: Props) {
  const sides = game.sides;
  const box = boardBox(sides);
  const rot = viewRotation(sides, viewSide);
  const activeSides = useMemo(() => {
    const a = Array.from({ length: sides }, () => false);
    for (const p of game.players) a[p.side] = true;
    return a;
  }, [game.players, sides]);

  // Varias fichas en la misma casilla se reparten a lo largo de la casilla.
  const pieces = useMemo(() => {
    const home = homeFor(sides);
    const items: { ref: PieceRef; pos: number; at: Pt; color: Color }[] = [];
    view.forEach((list, owner) =>
      list.forEach((pos, index) => {
        const pl = game.players[owner]!;
        items.push({ ref: { owner, index }, pos, at: piecePoint(sides, pl.side, pos, index), color: pl.color });
      }),
    );
    const groups = new Map<string, { idx: number[]; axis: Pt }>();
    items.forEach((it, i) => {
      if (it.pos < 0 || it.pos === home) return;
      const cell = pieceCell(sides, game.players[it.ref.owner]!.side, it.pos)!;
      const key = `${Math.round(cell.center.x)},${Math.round(cell.center.y)}`;
      const g = groups.get(key) ?? { idx: [], axis: cell.axis };
      g.idx.push(i);
      groups.set(key, g);
    });
    for (const g of groups.values()) {
      g.idx.forEach((i, k) => {
        const o = stackOffset(g.axis, k, g.idx.length, g.idx.length > 3 ? 24 : 30);
        items[i]!.at = { x: items[i]!.at.x + o.x, y: items[i]!.at.y + o.y };
      });
    }
    return items;
  }, [view, game.players, sides]);

  return (
    <svg viewBox={`${-box.w} ${-box.h} ${box.w * 2} ${box.h * 2}`} className="board-svg" role="img" aria-label="Tablero de parqués">
      <BoardDefs />
      <g transform={`rotate(${rot})`}>
        <BoardBase sides={sides} active={activeSides} />

        {targets.map((t, i) => (
          <g key={`t-${i}`} onClick={() => onTarget(t.move)} style={{ cursor: 'pointer' }} data-target={t.label}>
            <motion.circle
              cx={t.at.x}
              cy={t.at.y}
              r={24}
              fill="rgba(255,255,255,.55)"
              stroke="#fff"
              strokeWidth={4}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [1, 1.18, 1], opacity: 1 }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ transformOrigin: `${t.at.x}px ${t.at.y}px`, transformBox: 'view-box' }}
            />
            <g transform={`rotate(${-rot} ${t.at.x} ${t.at.y})`}>
              <rect x={t.at.x + 8} y={t.at.y - 52} width={t.label.length > 2 ? 58 : 36} height={34} rx={12} fill="#2a1660" stroke="#fff" strokeWidth={3} />
              <text x={t.at.x + 8 + (t.label.length > 2 ? 29 : 18)} y={t.at.y - 27} textAnchor="middle" fontSize={24} fontWeight={900} fill="#fff" fontFamily="Nunito">
                {t.label}
              </text>
            </g>
            <circle cx={t.at.x} cy={t.at.y} r={34} fill="transparent" />
          </g>
        ))}

        {[...pieces]
          .sort((a, b) => Number(movable.has(`${a.ref.owner}-${a.ref.index}`)) - Number(movable.has(`${b.ref.owner}-${b.ref.index}`)))
          .map((p) => {
            const key = `${p.ref.owner}-${p.ref.index}`;
            return (
              <Piece
                key={key}
                id={key}
                at={p.at}
                pos={p.pos}
                color={p.color}
                movable={movable.has(key)}
                selected={!!selected && selected.owner === p.ref.owner && selected.index === p.ref.index}
                crowned={p.pos === homeFor(sides)}
                onClick={() => onPiece(p.ref)}
              />
            );
          })}

        <FxLayer fx={fx} rot={rot} />
      </g>
    </svg>
  );
}

export { armCell };

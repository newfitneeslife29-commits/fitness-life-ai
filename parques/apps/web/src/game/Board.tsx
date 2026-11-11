import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLORS_4, COLORS_6, homeFor, isSafeSquare, SQUARES_PER_SIDE, trackLength } from '@parques/engine';
import type { Color, GameState, Move, PieceRef } from '@parques/engine';
import {
  armCell,
  boardExtent,
  centerPolygon,
  corridorCell,
  jailGeom,
  OUTLINE_R6,
  piecePoint,
  stackOffset,
  trackCell,
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

/** Capa estática del tablero (se memoiza: no cambia durante la partida). */
const BoardBase = memo(function BoardBase({ sides, rot, active }: { sides: 4 | 6; rot: number; active: boolean[] }) {
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const E = boardExtent(sides);
  const len = trackLength(sides);
  const center = centerPolygon(sides);
  const outline =
    sides === 4
      ? null
      : Array.from({ length: sides }, (_, i) => {
          const t = (i * 2 * Math.PI) / sides;
          const R = OUTLINE_R6;
          return `${(-Math.sin(t) * R).toFixed(1)},${(Math.cos(t) * R).toFixed(1)}`;
        }).join(' ');

  return (
    <g>
      {/* Base del tablero */}
      {sides === 4 ? (
        <rect x={-E + 6} y={-E + 6} width={(E - 6) * 2} height={(E - 6) * 2} rx={42} fill="url(#boardBg)" stroke="#2a1660" strokeWidth={8} />
      ) : (
        <polygon points={outline!} fill="url(#boardBg)" stroke="#2a1660" strokeWidth={8} strokeLinejoin="round" />
      )}
      {/* Borde tipo sombrero vueltiao */}
      {sides === 4 ? (
        <rect x={-E + 18} y={-E + 18} width={(E - 18) * 2} height={(E - 18) * 2} rx={32} fill="none" stroke="#2a1400" strokeOpacity={0.55} strokeWidth={6} strokeDasharray="14 10" />
      ) : null}

      {/* Cárceles */}
      {colors.map((color, side) => {
        const j = jailGeom(sides, side);
        return (
          <g key={`jail-${side}`} opacity={active[side] ? 1 : 0.35}>
            <circle cx={j.center.x} cy={j.center.y} r={j.radius} fill={c(color)} stroke={cd(color)} strokeWidth={8} />
            <circle cx={j.center.x} cy={j.center.y} r={j.radius - 18} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" />
            <circle cx={j.center.x} cy={j.center.y} r={j.radius * 0.62} fill="rgba(0,0,0,.14)" />
            {/* Rejas de la cárcel */}
            {[-1, 0, 1].map((k) => (
              <line
                key={k}
                x1={j.center.x + k * j.radius * 0.28}
                x2={j.center.x + k * j.radius * 0.28}
                y1={j.center.y - j.radius * 0.55}
                y2={j.center.y + j.radius * 0.55}
                stroke="rgba(0,0,0,.18)"
                strokeWidth={6}
                strokeLinecap="round"
                transform={`rotate(${-rot} ${j.center.x} ${j.center.y})`}
              />
            ))}
          </g>
        );
      })}

      {/* Recorrido común */}
      {Array.from({ length: len }, (_, sq) => {
        const cell = trackCell(sides, sq);
        const side = Math.floor(sq / SQUARES_PER_SIDE);
        const o = sq % SQUARES_PER_SIDE;
        const color = colors[side]!;
        const isExit = o === 5;
        const isCap = o === 0;
        const fill = isExit ? c(color) : isCap ? `color-mix(in srgb, ${c(color)} 45%, white)` : 'var(--board-cell)';
        return (
          <g key={`sq-${sq}`}>
            <polygon points={cell.points} fill={fill} stroke="var(--board-line)" strokeWidth={2.5} strokeLinejoin="round" />
            {isSafeSquare(sq) && !isExit ? <Star at={cell.center} r={14} fill={isCap ? cd(color) : '#ffb703'} /> : null}
            {isExit ? <Flower at={cell.center} /> : null}
          </g>
        );
      })}

      {/* Pasillos */}
      {colors.map((color, side) =>
        Array.from({ length: 7 }, (_, i) => {
          const cell = corridorCell(sides, side, i + 1);
          return (
            <polygon
              key={`cor-${side}-${i}`}
              points={cell.points}
              fill={`color-mix(in srgb, ${c(color)} ${55 + i * 5}%, white)`}
              stroke="var(--board-line)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              opacity={active[side] ? 1 : 0.45}
            />
          );
        }),
      )}

      {/* Cielo (centro) */}
      {colors.map((color, side) => {
        const a = center[(side + sides - 1) % sides]!;
        const b = center[side]!;
        return <polygon key={`home-${side}`} points={`0,0 ${a.x},${a.y} ${b.x},${b.y}`} fill={c(color)} stroke="var(--board-line)" strokeWidth={2.5} strokeLinejoin="round" />;
      })}
      <circle r={sides === 4 ? 30 : 40} fill="#fff8ec" stroke="#2a1400" strokeWidth={3} />
      <g transform={`rotate(${-rot})`}>
        <Sombrero size={sides === 4 ? 38 : 48} />
      </g>
      {/* Marca de las celdas de entrada de cada brazo para que se lea el sentido */}
      {colors.map((color, side) => {
        const cap = armCell(sides, side, 'M', 7);
        return <circle key={`cap-${side}`} cx={cap.center.x} cy={cap.center.y} r={5} fill={cd(color)} opacity={0.6} />;
      })}
    </g>
  );
});

function Star({ at, r, fill }: { at: Pt; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const t = (i * Math.PI) / 5 - Math.PI / 2;
    return `${(at.x + Math.cos(t) * rr).toFixed(1)},${(at.y + Math.sin(t) * rr).toFixed(1)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke="#2a1400" strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />;
}

/** Flor de silleta estilizada para las salidas. */
function Flower({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-9} rx={5} ry={9} fill="rgba(255,255,255,.85)" transform={`rotate(${i * 60})`} />
      ))}
      <circle r={5} fill="#ffcf3f" stroke="#2a1400" strokeWidth={1.5} />
    </g>
  );
}

/** Sombrero vueltiao estilizado (emblema central). */
export function Sombrero({ size }: { size: number }) {
  const s = size / 40;
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx={0} cy={6} rx={30} ry={10} fill="#f4e3c1" stroke="#2a1400" strokeWidth={2} />
      <ellipse cx={0} cy={6} rx={22} ry={6.5} fill="none" stroke="#2a1400" strokeWidth={2} strokeDasharray="3 2" />
      <path d="M-14 5 Q-13 -14 0 -15 Q13 -14 14 5 Z" fill="#f4e3c1" stroke="#2a1400" strokeWidth={2} />
      <path d="M-13 -2 Q0 2 13 -2" fill="none" stroke="#2a1400" strokeWidth={3} />
      <path d="M-12 -8 Q0 -5 12 -8" fill="none" stroke="#2a1400" strokeWidth={2} strokeDasharray="2.5 2" />
    </g>
  );
}

export function Board({ game, view, viewSide, movable, selected, targets, fx, onPiece, onTarget }: Props) {
  const sides = game.sides;
  const E = boardExtent(sides);
  const rot = (-viewSide * 360) / sides;
  const activeSides = useMemo(() => {
    const a = Array.from({ length: sides }, () => false);
    for (const p of game.players) a[p.side] = true;
    return a;
  }, [game.players, sides]);

  // Posiciones dibujadas con desplazamiento cuando varias fichas comparten casilla.
  const pieces = useMemo(() => {
    const items: { ref: PieceRef; pos: number; at: Pt; color: Color }[] = [];
    view.forEach((list, owner) =>
      list.forEach((pos, index) => {
        const pl = game.players[owner]!;
        items.push({ ref: { owner, index }, pos, at: piecePoint(sides, pl.side, pos, index), color: pl.color });
      }),
    );
    const groups = new Map<string, number[]>();
    items.forEach((it, i) => {
      if (it.pos < 0) return; // en la cárcel cada ficha tiene su lugar
      const key = `${Math.round(it.at.x)},${Math.round(it.at.y)}`;
      groups.set(key, [...(groups.get(key) ?? []), i]);
    });
    for (const idxs of groups.values()) {
      idxs.forEach((i, k) => {
        const o = stackOffset(k, idxs.length);
        items[i]!.at = { x: items[i]!.at.x + o.x, y: items[i]!.at.y + o.y };
      });
    }
    return items;
  }, [view, game.players, sides]);

  return (
    <svg viewBox={`${-E} ${-E} ${E * 2} ${E * 2}`} className="board-svg" role="img" aria-label="Tablero de parqués">
      <defs>
        <radialGradient id="boardBg" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="100%" stopColor="#f1d9a8" />
        </radialGradient>
        <radialGradient id="pieceShine" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
          <stop offset="35%" stopColor="rgba(255,255,255,.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${rot})`}>
        <BoardBase sides={sides} rot={rot} active={activeSides} />

        {targets.map((t, i) => (
          <g key={`t-${i}`} onClick={() => onTarget(t.move)} style={{ cursor: 'pointer' }} data-target={t.label}>
            <motion.circle
              cx={t.at.x}
              cy={t.at.y}
              r={26}
              fill="rgba(255,255,255,.45)"
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

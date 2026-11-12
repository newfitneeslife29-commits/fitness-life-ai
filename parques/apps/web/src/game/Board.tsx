import { createContext, memo, useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLORS_4, COLORS_6, homeFor, SQUARES_PER_SIDE, trackLength } from '@parques/engine';
import type { Color, GameState, Move, PieceRef } from '@parques/engine';
import {
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
import type { BoardTheme, EffectStyle, PieceStyle } from '@parques/engine';
import { tr } from '../lib/i18n';

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
  theme: BoardTheme;
  pieceStyle: PieceStyle;
  effect: EffectStyle;
}

const c = (color: Color) => `var(--${color})`;
const cd = (color: Color) => `var(--${color}-dark)`;
const LINE = 'var(--board-line)';

/** Prefijo de ids SVG: permite varios tableros con temas distintos en la misma pantalla. */
const Idp = createContext('b-');
const useUrl = () => {
  const p = useContext(Idp);
  return (id: string) => `url(#${p}${id})`;
};

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
      stroke="rgba(0,0,0,.5)"
      strokeWidth={3.5}
      paintOrder="stroke"
      pointerEvents="none"
    >
      {text}
    </text>
  );
}

/** Casilla de color con relieve: brillo arriba, sombra abajo. */
function SolidCell({ cell, color }: { cell: Cell; color: Color }) {
  const url = useUrl();
  return (
    <g>
      <polygon points={cell.points} fill={c(color)} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={cell.points} fill={url('cellGloss')} pointerEvents="none" />
    </g>
  );
}

/** Tablero estático (sin fichas): canto 3D, cárceles, casillas, pasillos y cielo. */
export const BoardScene = memo(function BoardScene({ sides, active, theme, rot, labels = true }: { sides: 4 | 6; active: boolean[]; theme: BoardTheme; rot: number; labels?: boolean }) {
  const url = useUrl();
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const len = trackLength(sides);
  const { font } = params(sides);
  const sky = skyRadius(sides);
  const idp = useContext(Idp);
  const cell = theme.cell ?? null;
  const SALIDA = labels ? tr('SALIDA') : '';
  const SEGURO = labels ? tr('SEGURO') : '';
  const LLEGADA = labels ? tr('LLEGADA') : '';

  return (
    <g>
      {/* Canto del tablero (grosor 3D) dibujado en pantalla, debajo del tablero */}
      {[34, 26, 18, 10].map((dy, i) => (
        <g key={dy} transform={`rotate(${-rot}) translate(0 ${dy}) rotate(${rot})`}>
          <polygon points={outlinePoints(sides, 16)} fill={i === 0 ? 'rgba(0,0,0,.45)' : theme.slab} stroke={theme.frameDark} strokeWidth={i === 0 ? 0 : 6} strokeLinejoin="round" style={i === 0 ? { filter: 'blur(6px)' } : undefined} />
        </g>
      ))}

      {/* Marco con biselado */}
      <polygon points={outlinePoints(sides, 16)} fill={theme.frame} stroke={theme.frameDark} strokeWidth={8} strokeLinejoin="round" />
      <polygon points={outlinePoints(sides, 16)} fill={url('frameGloss')} />
      <polygon points={outlinePoints(sides, 2)} fill={url('skyBg')} stroke={theme.frameDark} strokeWidth={5} strokeLinejoin="round" />
      <polygon points={outlinePoints(sides, 2)} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={14} strokeLinejoin="round" style={{ filter: 'blur(3px)' }} />

      {/* Cielo con volumen */}
      <circle r={sky + 14} fill={theme.frameDark} opacity={0.35} />
      <circle r={sky + 6} fill="#fff" />
      <circle r={sky} fill={url('skyCircle')} />
      <circle r={sky} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth={10} style={{ filter: 'blur(2px)' }} />
      <Deco kind={theme.deco} sky={sky} />
      <ellipse cx={-sky * 0.25} cy={-sky * 0.45} rx={sky * 0.55} ry={sky * 0.28} fill="rgba(255,255,255,.28)" transform={`rotate(${-rot})`} />

      {/* Cárceles hundidas con rejas */}
      {colors.map((color, side) => {
        const j = jailGeom(sides, side);
        const u = j.axis;
        const v = { x: -u.y, y: u.x };
        const span = sides === 4 ? 190 : 130;
        const clip = `${idp}jail-${sides}-${side}`;
        return (
          <g key={`jail-${side}`} opacity={active[side] ? 1 : 0.45}>
            <clipPath id={clip}>
              <polygon points={j.points} />
            </clipPath>
            <polygon points={j.points} fill={c(color)} />
            <g clipPath={`url(#${clip})`}>
              <polygon points={j.points} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={28} style={{ filter: 'blur(8px)' }} />
              <g transform={`translate(${j.center.x} ${j.center.y})`} opacity={0.3}>
                <rect x={-34} y={-14} width={68} height={52} rx={10} fill={cd(color)} />
                <path d="M-20 -14 V-30 A20 20 0 0 1 20 -30 V-14" fill="none" stroke={cd(color)} strokeWidth={10} />
              </g>
              {[-2, -1, 0, 1, 2].map((k) => {
                const o = k * (sides === 4 ? 44 : 32);
                const f = 1 - Math.abs(k) * 0.18;
                const a = { x: j.center.x + v.x * o - u.x * span * f, y: j.center.y + v.y * o - u.y * span * f };
                const b = { x: j.center.x + v.x * o + u.x * span * f, y: j.center.y + v.y * o + u.y * span * f };
                return (
                  <g key={k}>
                    <line x1={a.x + 6} y1={a.y + 8} x2={b.x + 6} y2={b.y + 8} stroke="rgba(0,0,0,.3)" strokeWidth={13} strokeLinecap="round" />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cd(color)} strokeWidth={14} strokeLinecap="round" />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c(color)} strokeWidth={8} strokeLinecap="round" />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,.55)" strokeWidth={3} strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
            <polygon points={j.points} fill={url('jailGloss')} pointerEvents="none" />
            <polygon points={j.points} fill="none" stroke={LINE} strokeWidth={6} strokeLinejoin="round" />
          </g>
        );
      })}

      {/* Recorrido */}
      {Array.from({ length: len }, (_, sq) => {
        const cl = trackCell(sides, sq);
        const side = Math.floor(sq / SQUARES_PER_SIDE);
        const o = sq % SQUARES_PER_SIDE;
        const color = colors[side]!;
        if (o === 0 || o === 5 || o === 12) {
          return (
            <g key={`sq-${sq}`}>
              <SolidCell cell={cl} color={color} />
              {labels ? <Label cell={cl} text={o === 5 ? SALIDA : SEGURO} font={font} /> : null}
            </g>
          );
        }
        return (
          <g key={`sq-${sq}`}>
            <polygon points={cl.points} fill={cell ? `color-mix(in srgb, ${c(color)} ${theme.tint}%, ${cell})` : `color-mix(in srgb, ${c(color)} ${theme.tint}%, white)`} stroke={LINE} strokeWidth={2.5} strokeLinejoin="round" />
            <polygon points={cl.points} fill={url('tileGloss')} pointerEvents="none" />
          </g>
        );
      })}

      {/* Pasillos y llegada */}
      {colors.map((color, side) => (
        <g key={`cor-${side}`} opacity={active[side] ? 1 : 0.55}>
          {Array.from({ length: 7 }, (_, i) => (
            <SolidCell key={i} cell={corridorCell(sides, side, i + 1)} color={color} />
          ))}
          <SolidCell cell={llegadaCell(sides, side)} color={color} />
          {labels ? <Label cell={llegadaCell(sides, side)} text={LLEGADA} font={font} /> : null}
        </g>
      ))}
    </g>
  );
});

/** Decoración del cielo según el tablero. */
function Deco({ kind, sky }: { kind: BoardTheme['deco']; sky: number }) {
  const spots: [number, number, number][] = [
    [-0.45, -0.5, 120], [0.35, -0.25, 140], [-0.3, 0.2, 110], [0.4, 0.55, 150], [-0.05, -0.05, 170],
  ];
  if (kind === 'clouds') {
    return (
      <g pointerEvents="none">
        {spots.slice(0, 4).map(([x, y, k], i) => <Cloud key={i} x={sky * x} y={sky * y} s={sky / k} />)}
      </g>
    );
  }
  const glyph = { flowers: '🌸', snow: '❄️', coffee: '☕', confetti: '🎉', stars: '⭐', gold: '✨', marble: '🏛️', wood: '🍂' }[kind];
  return (
    <g pointerEvents="none">
      {spots.map(([x, y, k], i) => (
        <text key={i} x={sky * x} y={sky * y} fontSize={(sky / k) * 34} textAnchor="middle" dominantBaseline="central" opacity={0.9}>
          {glyph}
        </text>
      ))}
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
      <ellipse cx={0} cy={9} rx={34} ry={10} fill="#b9dcf5" />
      <ellipse cx={0} cy={6} rx={34} ry={13} fill="#fff" />
      <circle cx={-14} cy={0} r={13} fill="#fff" />
      <circle cx={6} cy={-6} r={17} fill="#fff" />
      <circle cx={22} cy={2} r={11} fill="#fff" />
    </g>
  );
}

/** Definiciones de gradientes (con prefijo para que convivan varios tableros). */
export function BoardDefs({ theme }: { theme: BoardTheme }) {
  const p = useContext(Idp);
  return (
    <defs>
      <radialGradient id={`${p}skyBg`} cx="50%" cy="45%" r="62%">
        <stop offset="0%" stopColor={theme.sky[0]} />
        <stop offset="60%" stopColor={theme.sky[1]} />
        <stop offset="100%" stopColor={theme.sky[2]} />
      </radialGradient>
      <radialGradient id={`${p}skyCircle`} cx="40%" cy="30%" r="75%">
        <stop offset="0%" stopColor={theme.circle[0]} />
        <stop offset="100%" stopColor={theme.circle[1]} />
      </radialGradient>
      <linearGradient id={`${p}frameGloss`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,.45)" />
        <stop offset="35%" stopColor="rgba(255,255,255,.05)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.3)" />
      </linearGradient>
      <linearGradient id={`${p}cellGloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,.5)" />
        <stop offset="40%" stopColor="rgba(255,255,255,.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.18)" />
      </linearGradient>
      <linearGradient id={`${p}tileGloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,.7)" />
        <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.08)" />
      </linearGradient>
      <radialGradient id={`${p}jailGloss`} cx="35%" cy="25%" r="85%">
        <stop offset="0%" stopColor="rgba(255,255,255,.45)" />
        <stop offset="45%" stopColor="rgba(255,255,255,.04)" />
        <stop offset="100%" stopColor="rgba(0,0,0,.28)" />
      </radialGradient>
    </defs>
  );
}

/** Miniatura 3D de un tablero (tienda, lobby). */
export function BoardMini({ theme, id, labels = false, className = '' }: { theme: BoardTheme; id: string; labels?: boolean; className?: string }) {
  const box = boardBox(4);
  const rot = viewRotation(4, 0);
  return (
    <Idp.Provider value={`${id}-`}>
      <svg viewBox={`${-box.w - 10} ${-box.h - 10} ${box.w * 2 + 20} ${box.h * 2 + 60}`} className={`board-mini ${className}`} style={{ ['--board-line' as string]: theme.line }} aria-hidden>
        <BoardDefs theme={theme} />
        <g transform={`rotate(${rot})`}>
          <BoardScene sides={4} active={[true, true, true, true]} theme={theme} rot={rot} labels={labels} />
        </g>
      </svg>
    </Idp.Provider>
  );
}

export function Board({ game, view, viewSide, movable, selected, targets, fx, onPiece, onTarget, theme, pieceStyle, effect }: Props) {
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

  // Orden de dibujo: las fichas más abajo en pantalla tapan a las de atrás (efecto 3D); las movibles encima.
  const t = (rot * Math.PI) / 180;
  const screenY = (p: Pt) => p.x * Math.sin(t) + p.y * Math.cos(t);
  const ordered = [...pieces].sort((a, b) => {
    const ma = Number(movable.has(`${a.ref.owner}-${a.ref.index}`));
    const mb = Number(movable.has(`${b.ref.owner}-${b.ref.index}`));
    return ma - mb || screenY(a.at) - screenY(b.at);
  });

  return (
    <Idp.Provider value="g-">
      <svg viewBox={`${-box.w} ${-box.h} ${box.w * 2} ${box.h * 2 + 40}`} className="board-svg" role="img" aria-label={tr('Tablero de parqués')} style={{ ['--board-line' as string]: theme.line }}>
        <BoardDefs theme={theme} />
        <g transform={`rotate(${rot})`}>
          <BoardScene sides={sides} active={activeSides} theme={theme} rot={rot} />

          {targets.map((tg, i) => (
            <g key={`t-${i}`} onClick={() => onTarget(tg.move)} style={{ cursor: 'pointer' }} data-target={tg.label}>
              <motion.circle
                cx={tg.at.x}
                cy={tg.at.y}
                r={24}
                fill="rgba(255,255,255,.55)"
                stroke="#fff"
                strokeWidth={4}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.18, 1], opacity: 1 }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ transformOrigin: `${tg.at.x}px ${tg.at.y}px`, transformBox: 'view-box' }}
              />
              <g transform={`rotate(${-rot} ${tg.at.x} ${tg.at.y})`}>
                <rect x={tg.at.x + 8} y={tg.at.y - 58} width={tg.label.length > 2 ? 58 : 36} height={34} rx={12} fill="#2a1660" stroke="#fff" strokeWidth={3} />
                <text x={tg.at.x + 8 + (tg.label.length > 2 ? 29 : 18)} y={tg.at.y - 33} textAnchor="middle" fontSize={24} fontWeight={900} fill="#fff" fontFamily="Nunito">
                  {tg.label}
                </text>
              </g>
              <circle cx={tg.at.x} cy={tg.at.y} r={34} fill="transparent" />
            </g>
          ))}

          {ordered.map((p) => {
            const key = `${p.ref.owner}-${p.ref.index}`;
            return (
              <Piece
                key={key}
                id={key}
                at={p.at}
                pos={p.pos}
                color={p.color}
                rot={rot}
                movable={movable.has(key)}
                selected={!!selected && selected.owner === p.ref.owner && selected.index === p.ref.index}
                crowned={p.pos === homeFor(sides)}
                style={pieceStyle}
                onClick={() => onPiece(p.ref)}
              />
            );
          })}

          <FxLayer fx={fx} rot={rot} effect={effect} />
        </g>
      </svg>
    </Idp.Provider>
  );
}

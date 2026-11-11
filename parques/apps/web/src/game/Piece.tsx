import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Color } from '@parques/engine';
import type { PieceStyle } from '../meta/catalog';
import type { Pt } from './boardLayout';

interface Props {
  id: string;
  at: Pt;
  pos: number;
  color: Color;
  movable: boolean;
  selected: boolean;
  crowned: boolean;
  style: PieceStyle;
  onClick: () => void;
}

const R = 17;

const starPts = (r: number, inner: number, n = 5) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const rr = i % 2 ? inner : r;
    const t = (i * Math.PI) / n - Math.PI / 2;
    return `${(Math.cos(t) * rr).toFixed(1)},${(Math.sin(t) * rr - 3).toFixed(1)}`;
  }).join(' ');

/** Dibujo estático de una ficha según el estilo comprado en la tienda. */
export function PieceGlyph({ color, style, r = R }: { color: Color; style: PieceStyle; r?: number }) {
  const fill = `var(--${color})`;
  const dark = `var(--${color}-dark)`;
  switch (style) {
    case 'gema': {
      const oct = Array.from({ length: 8 }, (_, i) => {
        const t = (i * Math.PI) / 4 + Math.PI / 8;
        return `${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r - 3).toFixed(1)}`;
      }).join(' ');
      return (
        <g>
          <circle r={r} fill={dark} />
          <polygon points={oct} fill={fill} stroke={dark} strokeWidth={2} />
          <polygon points={`0,${-r - 1} ${r * 0.5},-3 0,${r * 0.6} ${-r * 0.5},-3`} fill="rgba(255,255,255,.35)" />
          <polygon points={`${-r * 0.5},-3 0,${-r - 1} ${-r * 0.9},${-r * 0.45}`} fill="rgba(255,255,255,.55)" />
          <circle r={r} cy={-3} fill="url(#pieceShine)" />
        </g>
      );
    }
    case 'moneda':
      return (
        <g>
          <circle r={r} fill="#8a5a00" />
          <circle r={r} cy={-3} fill="#ffcf3f" stroke="#c98a00" strokeWidth={2} />
          <circle r={r * 0.7} cy={-3} fill={fill} stroke="#c98a00" strokeWidth={2} />
          <polygon points={starPts(r * 0.38, r * 0.16)} fill="#fff7c2" />
          <circle r={r} cy={-3} fill="url(#pieceShine)" />
        </g>
      );
    case 'brillante':
      return (
        <g>
          <circle r={r + 6} cy={-3} fill={fill} opacity={0.35} />
          <circle r={r} fill={dark} />
          <circle r={r} cy={-3} fill={fill} stroke="#fff" strokeWidth={2.5} />
          <circle r={r} cy={-3} fill="url(#pieceShine)" />
          <path d={`M${r * 0.35} ${-r * 0.75} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#fff" />
        </g>
      );
    case 'estrella':
      return (
        <g>
          <polygon points={starPts(r * 1.15, r * 0.55)} transform="translate(0 3)" fill={dark} />
          <polygon points={starPts(r * 1.15, r * 0.55)} fill={fill} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
          <circle r={r * 0.3} cy={-3} fill="#fff8c4" />
        </g>
      );
    default:
      return (
        <g>
          <circle r={r} fill={dark} />
          <circle r={r} cy={-3} fill={fill} stroke={dark} strokeWidth={2.5} />
          <circle r={r * 0.55} cy={-3} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={2.5} />
          <circle r={r} cy={-3} fill="url(#pieceShine)" />
        </g>
      );
  }
}

/** Ficha: salta en cada casilla (la clave `pos` re-monta el salto) y rebota si se puede mover. */
export const Piece = memo(function Piece({ id, at, pos, color, movable, selected, crowned, style, onClick }: Props) {
  const r = crowned ? R * 0.75 : R;
  return (
    <motion.g
      initial={false}
      animate={{ x: at.x, y: at.y }}
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.14 }}
      onClick={movable ? onClick : undefined}
      style={{ cursor: movable ? 'pointer' : 'default' }}
      data-piece={id}
      data-movable={movable || undefined}
    >
      <ellipse cx={0} cy={r * 0.75} rx={r * 0.95} ry={r * 0.4} fill="rgba(0,0,0,.3)" />
      <motion.g
        key={pos}
        initial={{ y: pos >= 0 ? -14 : 0, scale: pos >= 0 ? 1.12 : 1 }}
        animate={movable ? { y: [0, -7, 0], scale: 1 } : { y: 0, scale: 1 }}
        transition={movable ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 600, damping: 18 }}
      >
        {movable ? (
          <motion.circle r={r + 7} fill="none" stroke="#fff" strokeWidth={3.5} animate={{ opacity: [0.9, 0.25, 0.9] }} transition={{ duration: 0.9, repeat: Infinity }} />
        ) : null}
        {selected ? <circle r={r + 9} fill="none" stroke="#ffcf3f" strokeWidth={5} /> : null}
        <PieceGlyph color={color} style={style} r={r} />
        {crowned ? (
          <path d="M-9 -14 L-9 -22 L-4.5 -18 L0 -24 L4.5 -18 L9 -22 L9 -14 Z" fill="#ffcf3f" stroke="#7a4b00" strokeWidth={1.5} strokeLinejoin="round" />
        ) : null}
        <circle r={r + 10} fill="transparent" />
      </motion.g>
    </motion.g>
  );
});

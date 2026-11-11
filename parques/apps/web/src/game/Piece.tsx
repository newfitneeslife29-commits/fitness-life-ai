import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Color } from '@parques/engine';
import type { Pt } from './boardLayout';

interface Props {
  id: string;
  at: Pt;
  pos: number;
  color: Color;
  movable: boolean;
  selected: boolean;
  crowned: boolean;
  onClick: () => void;
}

const R = 17;

/** Ficha: salta en cada casilla (la clave `pos` re-monta el salto) y rebota si se puede mover. */
export const Piece = memo(function Piece({ id, at, pos, color, movable, selected, crowned, onClick }: Props) {
  const fill = `var(--${color})`;
  const dark = `var(--${color}-dark)`;
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
      <ellipse cx={0} cy={r * 0.75} rx={r * 0.95} ry={r * 0.4} fill="rgba(0,0,0,.28)" />
      <motion.g
        key={pos}
        initial={{ y: pos >= 0 ? -14 : 0, scale: pos >= 0 ? 1.12 : 1 }}
        animate={movable ? { y: [0, -7, 0], scale: 1 } : { y: 0, scale: 1 }}
        transition={movable ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 600, damping: 18 }}
      >
        {movable ? (
          <motion.circle
            r={r + 7}
            fill="none"
            stroke="#fff"
            strokeWidth={3.5}
            animate={{ opacity: [0.9, 0.25, 0.9] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        ) : null}
        {selected ? <circle r={r + 9} fill="none" stroke="#ffcf3f" strokeWidth={5} /> : null}
        <circle r={r} fill={dark} />
        <circle r={r} cy={-3} fill={fill} stroke={dark} strokeWidth={2.5} />
        <circle r={r * 0.55} cy={-3} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={2.5} />
        <circle r={r} cy={-3} fill="url(#pieceShine)" />
        {crowned ? (
          <path d="M-9 -14 L-9 -22 L-4.5 -18 L0 -24 L4.5 -18 L9 -22 L9 -14 Z" fill="#ffcf3f" stroke="#7a4b00" strokeWidth={1.5} strokeLinejoin="round" />
        ) : null}
        {/* Área táctil generosa */}
        <circle r={r + 10} fill="transparent" />
      </motion.g>
    </motion.g>
  );
});

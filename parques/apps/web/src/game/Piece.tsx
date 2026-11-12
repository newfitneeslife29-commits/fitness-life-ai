import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Color } from '@parques/engine';
import type { PieceStyle } from '@parques/engine';
import type { Pt } from './boardLayout';

interface Props {
  id: string;
  at: Pt;
  pos: number;
  color: Color;
  /** Rotación del tablero: la ficha se contra-rota para quedar siempre de pie. */
  rot: number;
  movable: boolean;
  selected: boolean;
  crowned: boolean;
  style: PieceStyle;
  onClick: () => void;
}

const R = 19;

const starPts = (r: number, inner: number, cy = 0, n = 5) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const rr = i % 2 ? inner : r;
    const t = (i * Math.PI) / n - Math.PI / 2;
    return `${(Math.cos(t) * rr).toFixed(1)},${(Math.sin(t) * rr + cy).toFixed(1)}`;
  }).join(' ');

/**
 * Ficha 3D tipo peón: base, cuerpo con sombreado cilíndrico y cabeza esférica brillante.
 * El estilo (tienda) cambia acabados y adornos. Usa gradientes globales de <GlobalDefs/>.
 */
export function PieceGlyph({ color, style, r = R }: { color: Color; style: PieceStyle; r?: number }) {
  const fill = `var(--${color})`;
  const dark = `var(--${color}-dark)`;
  const rim = style === 'moneda' || style === 'corona' ? '#e0a400' : dark;
  const h = r * 1.25; // alto del cuerpo
  const headR = r * 0.62;
  const headY = -h - headR * 0.55;
  const body = `M${-r * 0.78} 0 C${-r * 0.7} ${-h * 0.45} ${-r * 0.32} ${-h * 0.7} ${-r * 0.34} ${-h} L${r * 0.34} ${-h} C${r * 0.32} ${-h * 0.7} ${r * 0.7} ${-h * 0.45} ${r * 0.78} 0 Z`;
  const glass = style === 'cristal';
  return (
    <g>
      {/* base */}
      <ellipse cx={0} cy={2} rx={r} ry={r * 0.42} fill={rim} />
      <ellipse cx={0} cy={-1} rx={r} ry={r * 0.42} fill={fill} opacity={glass ? 0.75 : 1} stroke="rgba(0,0,0,.55)" strokeWidth={1.6} />
      <ellipse cx={0} cy={-1} rx={r} ry={r * 0.42} fill="url(#pc-side)" />
      {/* cuerpo */}
      <path d={body} fill={fill} opacity={glass ? 0.7 : 1} stroke="rgba(0,0,0,.6)" strokeWidth={1.8} strokeLinejoin="round" />
      <path d={body} fill="url(#pc-side)" />
      {style === 'moneda' || style === 'corona' ? <ellipse cx={0} cy={-h} rx={r * 0.42} ry={r * 0.14} fill="#ffcf3f" stroke="#a87400" strokeWidth={1.5} /> : null}
      {/* cabeza */}
      {style === 'estrella' ? (
        <g>
          <polygon points={starPts(headR * 1.5, headR * 0.7, headY)} fill={fill} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
          <polygon points={starPts(headR * 1.5, headR * 0.7, headY)} fill="url(#pc-head)" />
        </g>
      ) : style === 'gema' ? (
        <g>
          <polygon points={`0,${headY - headR * 1.2} ${headR},${headY} 0,${headY + headR} ${-headR},${headY}`} fill={fill} stroke={dark} strokeWidth={2} />
          <polygon points={`0,${headY - headR * 1.2} ${headR},${headY} 0,${headY}`} fill="rgba(255,255,255,.55)" />
          <polygon points={`0,${headY} ${-headR},${headY} 0,${headY + headR}`} fill="rgba(0,0,0,.2)" />
        </g>
      ) : (
        <g>
          <circle cx={0} cy={headY} r={headR} fill={fill} opacity={glass ? 0.75 : 1} stroke="rgba(0,0,0,.6)" strokeWidth={1.8} />
          <circle cx={0} cy={headY} r={headR} fill="url(#pc-head)" />
          {glass ? <circle cx={0} cy={headY} r={headR} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={1.5} /> : null}
        </g>
      )}
      {style === 'corona' ? (
        <path
          d={`M${-headR} ${headY - headR * 0.6} l0 ${-headR * 0.9} l${headR * 0.5} ${headR * 0.5} l${headR * 0.5} ${-headR * 0.8} l${headR * 0.5} ${headR * 0.8} l${headR * 0.5} ${-headR * 0.5} l0 ${headR * 0.9} z`}
          fill="#ffcf3f"
          stroke="#7a4b00"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ) : null}
      {style === 'brillante' ? (
        <path d={`M${headR * 0.7} ${headY - headR * 1.4} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#fff" />
      ) : null}
      {style === 'brillante' ? <circle cx={0} cy={headY} r={headR + 5} fill={fill} opacity={0.25} /> : null}
    </g>
  );
}

/** Ficha en el tablero: salta en cada casilla y rebota si se puede mover. */
export const Piece = memo(function Piece({ id, at, pos, color, rot, movable, selected, crowned, style, onClick }: Props) {
  const r = crowned ? R * 0.72 : R;
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
      <g transform={`rotate(${-rot})`}>
        <ellipse cx={3} cy={r * 0.25 + 3} rx={r * 1.05} ry={r * 0.45} fill="rgba(0,0,0,.35)" />
        {movable ? (
          <motion.ellipse rx={r + 9} ry={(r + 9) * 0.5} cy={0} fill="none" stroke="#fff" strokeWidth={3.5} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        ) : null}
        {selected ? <ellipse rx={r + 11} ry={(r + 11) * 0.5} fill="rgba(255,207,63,.35)" stroke="#ffcf3f" strokeWidth={4} /> : null}
        <motion.g
          key={pos}
          initial={{ y: pos >= 0 ? -18 : 0, scale: pos >= 0 ? 1.08 : 1 }}
          animate={movable ? { y: [0, -9, 0], scale: 1 } : { y: 0, scale: 1 }}
          transition={movable ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 600, damping: 18 }}
        >
          <PieceGlyph color={color} style={style} r={r} />
          {crowned ? (
            <path d="M-9 -44 L-9 -52 L-4.5 -48 L0 -54 L4.5 -48 L9 -52 L9 -44 Z" fill="#ffcf3f" stroke="#7a4b00" strokeWidth={1.5} strokeLinejoin="round" />
          ) : null}
          <rect x={-r - 8} y={-r * 3} width={(r + 8) * 2} height={r * 3.6} fill="transparent" />
        </motion.g>
      </g>
    </motion.g>
  );
});

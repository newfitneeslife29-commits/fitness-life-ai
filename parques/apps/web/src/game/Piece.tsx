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
/** Acabados especiales: color del cuerpo según el estilo (si no, el color del jugador). */
const FINISH: Partial<Record<PieceStyle, (fill: string) => { body: string; overlay?: string; stroke?: string }>> = {
  perla: (f) => ({ body: f, overlay: 'url(#pc-pearl)' }),
  mate: (f) => ({ body: f, overlay: 'url(#pc-matte)' }),
  obsidiana: () => ({ body: '#16131f', overlay: 'url(#pc-head)', stroke: '#000' }),
  fuego: (f) => ({ body: f, overlay: 'url(#pc-fire)' }),
  viento: (f) => ({ body: f, overlay: 'url(#pc-wind)' }),
};

export function PieceGlyph({ color, style, r = R }: { color: Color; style: PieceStyle; r?: number }) {
  const baseFill = `var(--${color})`;
  const dark = `var(--${color}-dark)`;
  const finish = FINISH[style]?.(baseFill);
  const fill = finish?.body ?? baseFill;
  const rim = style === 'moneda' || style === 'corona' ? '#e0a400' : style === 'obsidiana' ? baseFill : dark;
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
      {finish?.overlay ? <path d={body} fill={finish.overlay} /> : null}
      {style === 'obsidiana' ? <path d={body} fill="none" stroke={baseFill} strokeWidth={2.5} opacity={0.9} /> : null}
      {style === 'tricolor' ? (
        <g>
          <path d={`M${-r * 0.74} ${-h * 0.2} L${r * 0.74} ${-h * 0.2} L${r * 0.6} ${-h * 0.42} L${-r * 0.6} ${-h * 0.42} Z`} fill="#ffcd00" />
          <path d={`M${-r * 0.6} ${-h * 0.42} L${r * 0.6} ${-h * 0.42} L${r * 0.45} ${-h * 0.58} L${-r * 0.45} ${-h * 0.58} Z`} fill="#003893" />
          <path d={`M${-r * 0.45} ${-h * 0.58} L${r * 0.45} ${-h * 0.58} L${r * 0.38} ${-h * 0.72} L${-r * 0.38} ${-h * 0.72} Z`} fill="#ce1126" />
        </g>
      ) : null}
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
      {style === 'perla' ? <circle cx={-headR * 0.3} cy={headY - headR * 0.35} r={headR * 0.28} fill="#fff" opacity={0.9} /> : null}
      {style === 'fuego' ? (
        <motion.path
          d={`M0 ${headY - headR * 2.3} C${headR * 0.9} ${headY - headR * 1.4} ${headR * 0.6} ${headY - headR * 0.7} 0 ${headY - headR * 0.8} C${-headR * 0.6} ${headY - headR * 0.7} ${-headR * 0.9} ${headY - headR * 1.4} 0 ${headY - headR * 2.3}Z`}
          fill="#ffb020"
          stroke="#ff4d00"
          strokeWidth={1.5}
          animate={{ scaleY: [1, 1.25, 0.9, 1], opacity: [0.9, 1, 0.8, 0.9] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ transformOrigin: `0px ${headY - headR * 0.8}px` }}
        />
      ) : null}
      {style === 'viento' ? (
        <motion.g animate={{ x: [0, 3, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }}>
          <path d={`M${-r} ${headY - headR * 0.2} q${r * 0.6} ${-headR * 0.8} ${r * 1.2} 0`} fill="none" stroke="#e0f2fe" strokeWidth={2} strokeLinecap="round" />
          <path d={`M${-r * 0.6} ${-h * 0.5} q${r * 0.6} ${-headR * 0.6} ${r * 1.2} 0`} fill="none" stroke="#e0f2fe" strokeWidth={1.6} strokeLinecap="round" />
        </motion.g>
      ) : null}
    </g>
  );
}

/** Duración de un salto de casilla (igual a la pausa entre pasos del gameStore). */
export const HOP_S = 0.22;

/** Ficha en el tablero: salta en arco 3D de casilla en casilla (sombra que se achica) y rebota si se puede mover. */
export const Piece = memo(function Piece({ id, at, pos, color, rot, movable, selected, crowned, style, onClick }: Props) {
  const r = crowned ? R * 0.72 : R;
  const onBoard = pos >= 0;
  return (
    <motion.g
      initial={false}
      animate={{ x: at.x, y: at.y }}
      transition={{ type: 'tween', ease: [0.45, 0, 0.55, 1], duration: HOP_S }}
      onClick={movable ? onClick : undefined}
      style={{ cursor: movable ? 'pointer' : 'default' }}
      data-piece={id}
      data-movable={movable || undefined}
    >
      <g transform={`rotate(${-rot})`}>
        <motion.ellipse
          key={`sh-${pos}`}
          cx={3}
          cy={r * 0.25 + 3}
          rx={r * 1.05}
          ry={r * 0.45}
          fill="rgba(0,0,0,.35)"
          initial={false}
          animate={onBoard ? { scale: [1, 0.55, 1], opacity: [0.35, 0.15, 0.35] } : { scale: 1, opacity: 0.35 }}
          transition={{ duration: HOP_S, ease: 'easeInOut' }}
        />
        {movable ? (
          <motion.ellipse rx={r + 9} ry={(r + 9) * 0.5} cy={0} fill="none" stroke="#fff" strokeWidth={3.5} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        ) : null}
        {selected ? <ellipse rx={r + 11} ry={(r + 11) * 0.5} fill="rgba(255,207,63,.35)" stroke="#ffcf3f" strokeWidth={4} /> : null}
        <motion.g
          key={pos}
          initial={false}
          animate={
            movable
              ? { y: [0, -9, 0], scaleX: 1, scaleY: 1 }
              : onBoard
                ? { y: [0, -30, 0, 0], scaleX: [1, 0.94, 1.12, 1], scaleY: [1, 1.1, 0.86, 1] }
                : { y: 0, scaleX: 1, scaleY: 1 }
          }
          transition={movable ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { duration: HOP_S + 0.08, times: [0, 0.45, 0.8, 1], ease: 'easeOut' }}
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

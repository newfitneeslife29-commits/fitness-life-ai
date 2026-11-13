import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Color } from '@parques/engine';
import type { PieceStyle } from '@parques/engine';
import type { Pt } from './boardLayout';
import { useSettings } from '../stores/settingsStore';

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
  img?: string;
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
  ceramica: () => ({ body: '#c8693a' }),
  muisca: () => ({ body: '#f2b81e' }),
  esmeralda: (f) => ({ body: f, overlay: 'url(#pc-pearl)' }),
  neon: () => ({ body: '#0d0b22' }),
};

const IMG_COLORS = new Set<Color>(['amarillo', 'azul', 'rojo', 'verde']);

/** Ficha con arte (public/art/pieces/<img>-<color>.webp); los colores sin arte (naranja, morado) usan la ficha dibujada. */
export function PieceGlyph({ color, style, r = R, img }: { color: Color; style: PieceStyle; r?: number; img?: string }) {
  if (img && IMG_COLORS.has(color)) {
    const w = r * 2.7;
    return <image href={`art/pieces/${img}-${color}.webp`} x={-w / 2} y={-w * 0.92} width={w} height={w} preserveAspectRatio="xMidYMax meet" />;
  }
  return <PieceDrawn color={color} style={style} r={r} />;
}

function PieceDrawn({ color, style, r = R }: { color: Color; style: PieceStyle; r?: number }) {
  const baseFill = `var(--${color})`;
  const dark = `var(--${color}-dark)`;
  const finish = FINISH[style]?.(baseFill);
  const fill = finish?.body ?? baseFill;
  const rim = style === 'moneda' || style === 'corona' ? '#e0a400' : style === 'obsidiana' ? baseFill : dark;
  const h = r * 1.25; // alto del cuerpo
  const headR = r * 0.62;
  const headY = -h - headR * 0.55;
  const body = `M${-r * 0.78} 0 C${-r * 0.7} ${-h * 0.45} ${-r * 0.32} ${-h * 0.7} ${-r * 0.34} ${-h} L${r * 0.34} ${-h} C${r * 0.32} ${-h * 0.7} ${r * 0.7} ${-h * 0.45} ${r * 0.78} 0 Z`;
  const glass = style === 'cristal' || style === 'esmeralda';
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
      <StyleBody style={style} r={r} h={h} color={baseFill} />
      {style === 'moneda' || style === 'corona' ? <ellipse cx={0} cy={-h} rx={r * 0.42} ry={r * 0.14} fill="#ffcf3f" stroke="#a87400" strokeWidth={1.5} /> : null}
      {/* cabeza */}
      {style === 'estrella' ? (
        <g>
          <polygon points={starPts(headR * 1.5, headR * 0.7, headY)} fill={fill} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
          <polygon points={starPts(headR * 1.5, headR * 0.7, headY)} fill="url(#pc-head)" />
        </g>
      ) : style === 'grano' ? (
        <g>
          <ellipse cx={0} cy={headY} rx={headR * 0.95} ry={headR * 1.15} fill="#6d3b14" stroke="#2a1404" strokeWidth={1.8} />
          <path d={`M0 ${headY - headR * 1.05} C${headR * 0.45} ${headY - headR * 0.3} ${-headR * 0.45} ${headY + headR * 0.3} 0 ${headY + headR * 1.05}`} fill="none" stroke="#2a1404" strokeWidth={2} />
          <ellipse cx={-headR * 0.35} cy={headY - headR * 0.4} rx={headR * 0.22} ry={headR * 0.4} fill="rgba(255,220,180,.45)" />
        </g>
      ) : style === 'esmeralda' ? (
        <g>
          <polygon points={octPts(headR * 1.1, headY)} fill={fill} stroke={dark} strokeWidth={2} />
          <polygon points={octPts(headR * 0.6, headY)} fill="rgba(255,255,255,.35)" />
          <polygon points={`${-headR * 0.4},${headY - headR * 1.0} ${headR * 0.4},${headY - headR * 1.0} 0,${headY - headR * 0.3}`} fill="rgba(255,255,255,.6)" />
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
      {style === 'vueltiao' ? (
        <g>
          <ellipse cx={0} cy={headY - headR * 0.35} rx={headR * 1.7} ry={headR * 0.5} fill="#f3e6c4" stroke="#1a1a1a" strokeWidth={1.6} />
          <ellipse cx={0} cy={headY - headR * 0.35} rx={headR * 1.35} ry={headR * 0.38} fill="none" stroke="#1a1a1a" strokeWidth={1.4} strokeDasharray="3 2" />
          <path d={`M${-headR * 0.75} ${headY - headR * 0.4} C${-headR * 0.7} ${headY - headR * 1.6} ${headR * 0.7} ${headY - headR * 1.6} ${headR * 0.75} ${headY - headR * 0.4} Z`} fill="#f3e6c4" stroke="#1a1a1a" strokeWidth={1.6} />
          <path d={`M${-headR * 0.72} ${headY - headR * 0.75} Q0 ${headY - headR * 0.95} ${headR * 0.72} ${headY - headR * 0.75}`} fill="none" stroke="#1a1a1a" strokeWidth={2.4} />
          <path d={`M${-headR * 0.55} ${headY - headR * 1.1} Q0 ${headY - headR * 1.3} ${headR * 0.55} ${headY - headR * 1.1}`} fill="none" stroke="#1a1a1a" strokeWidth={2} />
        </g>
      ) : null}
      {style === 'neon' ? (
        <motion.g animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ filter: `drop-shadow(0 0 4px ${baseFill})` }}>
          <path d={body} fill="none" stroke={baseFill} strokeWidth={2.6} />
          <circle cx={0} cy={headY} r={headR} fill="none" stroke={baseFill} strokeWidth={2.6} />
          <ellipse cx={0} cy={-1} rx={r} ry={r * 0.42} fill="none" stroke={baseFill} strokeWidth={2} />
        </motion.g>
      ) : null}
      {style === 'cometa' ? (
        <g>
          {[1, 2, 3].map((k) => (
            <motion.circle
              key={k}
              cx={-headR * 0.9 * k}
              cy={headY + headR * 0.35 * k}
              r={headR * (1 - k * 0.22)}
              fill={fill}
              animate={{ opacity: [0.5 / k, 0.15 / k, 0.5 / k], cx: [-headR * 0.9 * k, -headR * 1.1 * k, -headR * 0.9 * k] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.1 }}
            />
          ))}
          <circle cx={headR * 0.25} cy={headY - headR * 0.3} r={headR * 0.3} fill="#fff" opacity={0.85} />
        </g>
      ) : null}
      {style === 'muisca' ? (
        <g fill="none" stroke="#8a5a00" strokeWidth={1.4}>
          <circle cx={0} cy={headY} r={headR * 0.45} />
          <path d={`M${-headR * 0.2} ${headY} a${headR * 0.2} ${headR * 0.2} 0 1 1 ${headR * 0.2} ${headR * 0.2}`} />
        </g>
      ) : null}
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

/** Puntos de un octágono (cabeza tallada). */
function octPts(r: number, cy: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${(Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
}

/** Decoración del cuerpo según el estilo (bandas, franjas, espirales). */
function StyleBody({ style, r, h, color }: { style: PieceStyle; r: number; h: number; color: string }) {
  const band = (y0: number, y1: number, fill: string, k: string) => {
    const w0 = r * (0.78 - 0.44 * y0);
    const w1 = r * (0.78 - 0.44 * y1);
    return <path key={k} d={`M${-w0} ${-h * y0} L${w0} ${-h * y0} L${w1} ${-h * y1} L${-w1} ${-h * y1} Z`} fill={fill} />;
  };
  if (style === 'ceramica')
    return (
      <g>
        {band(0.18, 0.3, color, 'a')}
        {band(0.52, 0.6, color, 'b')}
        {[-0.4, 0, 0.4].map((x) => (
          <circle key={x} cx={x * r} cy={-h * 0.41} r={r * 0.07} fill="#fff3e0" />
        ))}
      </g>
    );
  if (style === 'chiva')
    return <g>{[['#ffcd00', 0.12], ['#e53935', 0.27], ['#1e88e5', 0.42], ['#43a047', 0.57], ['#ffcd00', 0.72]].map(([c, y]) => band(y as number, (y as number) + 0.1, c as string, String(y)))}</g>;
  if (style === 'muisca')
    return (
      <g fill="none" stroke="#8a5a00" strokeWidth={1.3}>
        {[-0.35, 0.35].map((x) => (
          <path key={x} d={`M${x * r} ${-h * 0.35} m-${r * 0.14} 0 a${r * 0.14} ${r * 0.14} 0 1 1 ${r * 0.14} ${r * 0.14} a${r * 0.07} ${r * 0.07} 0 1 1 ${r * 0.07} ${-r * 0.07}`} />
        ))}
        {band(0.62, 0.68, '#8a5a00', 'z')}
      </g>
    );
  if (style === 'grano' || style === 'vueltiao') return band(0.66, 0.74, style === 'grano' ? '#6d3b14' : '#1a1a1a', 's');
  return null;
}

/** Duración de un salto de casilla (igual a la pausa entre pasos del gameStore). */
export const HOP_S = 0.22;

/** Ficha en el tablero: salta en arco 3D de casilla en casilla (sombra que se achica) y rebota si se puede mover. */
/** Figura de cada color (modo para daltónicos). */
export const COLOR_SHAPES: Record<Color, string> = { amarillo: '▲', rojo: '●', verde: '■', azul: '◆', naranja: '★', morado: '✚' };

export const Piece = memo(function Piece({ id, at, pos, color, rot, movable, selected, crowned, style, img, onClick }: Props) {
  const r = crowned ? R * 0.72 : R;
  const colorblind = useSettings((s) => s.colorblind);
  const onBoard = pos >= 0;
  // De vuelta a la cárcel (capturada o soplada): vuelo largo en arco con giro.
  const prev = useRef(pos);
  const [flying, setFlying] = useState(false);
  const toJail = flying || (pos < 0 && prev.current >= 0);
  useEffect(() => {
    const was = prev.current;
    prev.current = pos;
    if (pos < 0 && was >= 0) {
      setFlying(true);
      const t = setTimeout(() => setFlying(false), 800);
      return () => clearTimeout(t);
    }
  }, [pos]);
  return (
    <motion.g
      initial={false}
      animate={{ x: at.x, y: at.y }}
      transition={toJail ? { type: 'tween', ease: [0.3, 0, 0.3, 1], duration: 0.75 } : { type: 'tween', ease: [0.45, 0, 0.55, 1], duration: HOP_S }}
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
            toJail
              ? { y: [0, -90, -40, 0], rotate: [0, 200, 340, 360], scaleX: 1, scaleY: 1 }
              : movable
              ? { y: [0, -9, 0], scaleX: 1, scaleY: 1 }
              : onBoard
                ? { y: [0, -30, 0, 0], scaleX: [1, 0.94, 1.12, 1], scaleY: [1, 1.1, 0.86, 1] }
                : { y: 0, scaleX: 1, scaleY: 1 }
          }
          transition={toJail ? { duration: 0.75, times: [0, 0.4, 0.75, 1], ease: 'easeOut' } : movable ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { duration: HOP_S + 0.08, times: [0, 0.45, 0.8, 1], ease: 'easeOut' }}
        >
          <PieceGlyph color={color} style={style} r={r} img={img} />
          {colorblind ? (
            <g className="cb-mark" transform={`translate(0 ${-r * 1.15})`}>
              <circle r={r * 0.62} fill="rgba(0,0,0,.72)" stroke="#fff" strokeWidth={1.5} />
              <text y={r * 0.26} textAnchor="middle" fontSize={r * 0.8} fontWeight={900} fill="#fff">
                {COLOR_SHAPES[color]}
              </text>
            </g>
          ) : null}
          {crowned ? (
            <path d="M-9 -44 L-9 -52 L-4.5 -48 L0 -54 L4.5 -48 L9 -52 L9 -44 Z" fill="#ffcf3f" stroke="#7a4b00" strokeWidth={1.5} strokeLinejoin="round" />
          ) : null}
          <rect x={-r - 8} y={-r * 3} width={(r + 8) * 2} height={r * 3.6} fill="transparent" />
        </motion.g>
      </g>
    </motion.g>
  );
});

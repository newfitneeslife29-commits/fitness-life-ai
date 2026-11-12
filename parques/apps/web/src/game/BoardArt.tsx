/**
 * Tableros ilustrados: escenas de Colombia dibujadas en SVG dentro del cielo del tablero.
 * Cada escena se dibuja en un cuadro de -100..100 y se escala al radio del cielo.
 * Siempre queda derecha aunque el tablero gire (se contra-rota con `rot`).
 */
import { useContext, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { BoardArt as ArtId } from '@parques/engine';
import { Idp } from './idp';

/**
 * Dibujo de fondo de TODO el tablero (recortado a su contorno): se ve a través de las casillas,
 * las cárceles y el cielo, que se pintan semitransparentes encima.
 */
export function BoardArt({ art, r, rot, clipPoints }: { art: ArtId; r: number; rot: number; clipPoints: string }) {
  const idp = useContext(Idp);
  const p = `${idp}art-${art}-`;
  const Scene = SCENES[art];
  return (
    <g pointerEvents="none">
      <clipPath id={`${p}clip`}>
        <polygon points={clipPoints} />
      </clipPath>
      <g clipPath={`url(#${p}clip)`}>
        <g transform={`rotate(${-rot}) scale(${(r * 1.42) / 100})`}>
          <Scene p={p} />
        </g>
      </g>
    </g>
  );
}

type SceneFn = (props: { p: string }) => ReactNode;

const lin = (id: string, stops: [number, string][], vertical = true) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
    {stops.map(([o, c]) => (
      <stop key={o} offset={`${o}%`} stopColor={c} />
    ))}
  </linearGradient>
);

function Sun({ x, y, r, color = '#ffd84d', glow = '#fff1a8' }: { x: number; y: number; r: number; color?: string; glow?: string }) {
  return (
    <g>
      <motion.circle cx={x} cy={y} r={r * 1.7} fill={glow} opacity={0.35} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} animate={{ scale: [0.95, 1.12, 0.95] }} transition={{ duration: 4, repeat: Infinity }} />
      <circle cx={x} cy={y} r={r} fill={color} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.45} fill="#fff" opacity={0.35} />
    </g>
  );
}

function Palm({ x, y, s = 1, flip = false, trunk = '#8a5a2b', leaf = '#1f8a3a' }: { x: number; y: number; s?: number; flip?: boolean; trunk?: string; leaf?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C2 -18 6 -34 14 -50 L18 -48 C10 -32 6 -16 5 0 Z" fill={trunk} />
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={2 + k * 2.4} y1={-k * 10} x2={7 + k * 2.4} y2={-k * 10 - 1} stroke="rgba(0,0,0,.25)" strokeWidth={1.2} />
      ))}
      <g transform="translate(16 -50)">
        {[-150, -110, -60, -20, 20].map((a, i) => (
          <path key={i} transform={`rotate(${a})`} d="M0 0 C8 -4 20 -2 30 6 C20 4 10 4 0 0Z" fill={leaf} stroke="rgba(0,0,0,.2)" strokeWidth={0.6} />
        ))}
        <circle cx={-2} cy={3} r={3} fill="#6b3f1c" />
        <circle cx={3} cy={4} r={3} fill="#6b3f1c" />
      </g>
    </g>
  );
}

function Bird({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <motion.path
      d={`M${x - 6 * s} ${y} q${3 * s} ${-4 * s} ${6 * s} 0 q${3 * s} ${-4 * s} ${6 * s} 0`}
      fill="none"
      stroke="#2a2a2a"
      strokeWidth={1.4}
      strokeLinecap="round"
      animate={{ x: [0, 6, 0], y: [0, -2, 0] }}
      transition={{ duration: 3 + s, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Flower({ x, y, r, color, center = '#ffd84d' }: { x: number; y: number; r: number; color: string; center?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} transform={`rotate(${a}) translate(0 ${-r * 0.7})`} rx={r * 0.5} ry={r * 0.75} fill={color} stroke="rgba(0,0,0,.15)" strokeWidth={0.5} />
      ))}
      <circle r={r * 0.42} fill={center} />
    </g>
  );
}

// ---------------------------------------------------------------- Escenas

const Playa: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#ff9e6b'], [40, '#ffd29a'], [70, '#bdf3ff']])}
      {lin(`${p}sea`, [[0, '#2bc4d9'], [100, '#0a6f9c']])}
      {lin(`${p}sand`, [[0, '#ffe2a3'], [100, '#e8b765']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <Sun x={-30} y={-28} r={18} color="#ffb347" />
    <Bird x={20} y={-55} />
    <Bird x={38} y={-62} s={0.8} />
    <path d="M-100 5 Q-60 -2 -20 5 T60 5 T100 3 V100 H-100Z" fill={`url(#${p}sea)`} />
    {[15, 28, 42].map((y, i) => (
      <motion.path key={y} d={`M-100 ${y} q12 -5 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0`} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={1.6}
        animate={{ x: [0, 12, 0] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }} />
    ))}
    <g transform="translate(40 2)">
      <path d="M-14 0 H14 L10 6 H-10Z" fill="#7a3c0a" />
      <path d="M0 -26 V0 M0 -26 L12 -4 H0Z" fill="#fff" stroke="#7a3c0a" strokeWidth={1} />
    </g>
    <path d="M-100 52 Q-40 38 20 50 T100 46 V100 H-100Z" fill={`url(#${p}sand)`} />
    <Palm x={-62} y={66} s={1.15} />
    <Palm x={66} y={70} s={0.9} flip />
    <g transform="translate(-10 70)">
      <path d="M-14 0 A14 14 0 0 1 14 0Z" fill="#ff3b4e" />
      <path d="M-14 0 A14 14 0 0 1 -5 -11 L0 0Z" fill="#fff" />
      <line x1={0} y1={0} x2={0} y2={16} stroke="#555" strokeWidth={1.5} />
    </g>
    <ellipse cx={20} cy={80} rx={10} ry={3} fill="#ff6fb5" opacity={0.8} />
  </g>
);

const Cafetal: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#a7e1ff'], [100, '#e9f9ff']])}
      {lin(`${p}h1`, [[0, '#4caf50'], [100, '#2e7d32']])}
      {lin(`${p}h2`, [[0, '#7cb342'], [100, '#558b2f']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <Sun x={50} y={-50} r={14} />
    <path d="M-100 -10 L-60 -55 L-30 -25 L0 -60 L40 -18 L70 -45 L100 -15 V100 H-100Z" fill="#8fb4c9" opacity={0.7} />
    <path d="M-100 10 Q-50 -30 0 0 T100 -5 V100 H-100Z" fill={`url(#${p}h2)`} />
    {[-80, -60, -40, -20, 0, 20, 40, 60, 80].map((x, i) => (
      <g key={x}>{[0, 1, 2].map((k) => <circle key={k} cx={x + k * 4} cy={8 + Math.abs(x) * 0.05 + k * 9} r={3.2} fill="#1b5e20" />)}{i % 2 ? <circle cx={x + 2} cy={12} r={1.3} fill="#e53935" /> : null}</g>
    ))}
    <path d="M-100 40 Q-40 15 20 38 T100 30 V100 H-100Z" fill={`url(#${p}h1)`} />
    {/* Palmas de cera */}
    {[-70, -52, 72].map((x, i) => (
      <g key={x}>
        <rect x={x} y={-40 + i * 6} width={2.2} height={80} fill="#d7ccc8" />
        {[-60, -20, 20, 60, 100, 140].map((a) => (
          <path key={a} transform={`translate(${x + 1} ${-40 + i * 6}) rotate(${a})`} d="M0 0 C6 -2 14 0 20 5 C13 3 6 3 0 0Z" fill="#2e7d32" />
        ))}
      </g>
    ))}
    {/* Casa cafetera */}
    <g transform="translate(-5 46)">
      <rect x={-22} y={-14} width={44} height={22} fill="#fff8e1" stroke="#5d4037" strokeWidth={1} />
      <path d="M-27 -14 L0 -30 L27 -14Z" fill="#c62828" />
      {[-16, -4, 8].map((x, i) => <rect key={x} x={x} y={-9} width={8} height={10} fill={['#1565c0', '#2e7d32', '#f9a825'][i]} />)}
      <rect x={-22} y={0} width={44} height={2.5} fill="#8d6e63" />
      {[-14, 0, 14].map((x) => <Flower key={x} x={x} y={-12} r={2.4} color="#e91e63" />)}
    </g>
    <g transform="translate(55 70)">
      <ellipse cx={0} cy={6} rx={10} ry={4} fill="#6d4c41" />
      <path d="M-8 6 Q0 -12 8 6Z" fill="#8d6e63" />
      {[-4, 0, 4].map((x) => <circle key={x} cx={x} cy={0} r={1.8} fill="#c62828" />)}
    </g>
  </g>
);

const Cartagena: SceneFn = ({ p }) => {
  const colors = ['#ffb300', '#e91e63', '#29b6f6', '#66bb6a', '#ff7043', '#ab47bc', '#ffee58'];
  return (
    <g>
      <defs>{lin(`${p}sky`, [[0, '#ff7b54'], [55, '#ffb26b'], [100, '#ffe3b3']])}</defs>
      <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
      <Sun x={0} y={-30} r={20} color="#ffd166" />
      {/* Torre del reloj */}
      <g transform="translate(0 -10)">
        <rect x={-14} y={-20} width={28} height={50} fill="#f6e3c3" stroke="#8d6e63" strokeWidth={1} />
        <path d="M-17 -20 L0 -42 L17 -20Z" fill="#c0522a" />
        <circle cx={0} cy={-6} r={7} fill="#fff" stroke="#5d4037" strokeWidth={1.2} />
        <path d="M0 -6 V-11 M0 -6 L3 -4" stroke="#5d4037" strokeWidth={1} />
        <path d="M-8 30 V16 A8 8 0 0 1 8 16 V30Z" fill="#6d4c41" />
      </g>
      {/* Casas coloniales con balcones */}
      {colors.map((c, i) => {
        const x = -100 + i * 30 - (i > 2 ? -2 : 0);
        if (Math.abs(x + 15) < 18) return null;
        const h = 34 + (i % 3) * 8;
        return (
          <g key={i}>
            <rect x={x} y={52 - h} width={30} height={h + 50} fill={c} stroke="rgba(0,0,0,.2)" strokeWidth={0.6} />
            <rect x={x} y={52 - h} width={30} height={4} fill="rgba(0,0,0,.18)" />
            <rect x={x + 5} y={58 - h} width={20} height={10} fill="#5d4037" />
            <rect x={x + 3} y={68 - h} width={24} height={3} fill="#4e342e" />
            {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={x + 5 + k * 5} y1={68 - h} x2={x + 5 + k * 5} y2={62 - h} stroke="#3e2723" strokeWidth={0.8} />)}
            {[0, 1, 2].map((k) => <Flower key={k} x={x + 7 + k * 8} y={66 - h} r={2} color={k % 2 ? '#ff4081' : '#ff1744'} />)}
            <path d={`M${x + 9} 52 V40 A6 6 0 0 1 ${x + 21} 40 V52Z`} fill="#3e2723" />
          </g>
        );
      })}
      {/* Muralla */}
      <rect x={-100} y={52} width={200} height={50} fill="#d7b98e" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-100 + i * 15} y={46} width={9} height={7} fill="#d7b98e" />)}
      {Array.from({ length: 6 }, (_, i) => <line key={i} x1={-100} y1={60 + i * 7} x2={100} y2={60 + i * 7} stroke="rgba(0,0,0,.12)" strokeWidth={0.8} />)}
      <g transform="translate(-55 74)">
        <path d="M-10 0 Q0 -14 10 0Z" fill="#fdd835" />
        <rect x={-1} y={0} width={2} height={14} fill="#795548" />
      </g>
    </g>
  );
};

const Selva: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#b2f5c8'], [100, '#4caf50']])}
      {lin(`${p}river`, [[0, '#4fc3f7'], [100, '#0277bd']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    {[...Array(7)].map((_, i) => (
      <ellipse key={i} cx={-90 + i * 30} cy={-60 + (i % 2) * 10} rx={28} ry={34} fill={i % 2 ? '#2e7d32' : '#388e3c'} />
    ))}
    <path d="M-100 40 Q-30 20 20 35 T100 30 V100 H-100Z" fill={`url(#${p}river)`} />
    {[45, 58].map((y, i) => (
      <motion.path key={y} d={`M-100 ${y} q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={1.3}
        animate={{ x: [0, 10, 0] }} transition={{ duration: 5 + i, repeat: Infinity }} />
    ))}
    {/* Victoria regia */}
    {([[-30, 70], [10, 78], [50, 66]] as [number, number][]).map(([x, y]) => (
      <g key={x}>
        <ellipse cx={x} cy={y} rx={14} ry={5} fill="#43a047" stroke="#2e7d32" strokeWidth={1} />
        <path d={`M${x} ${y} L${x + 14} ${y - 1}`} stroke="#1b5e20" strokeWidth={1} />
      </g>
    ))}
    <Flower x={10} y={74} r={3} color="#f8bbd0" />
    {/* Hojas grandes */}
    {([[-95, 30, -30], [-80, 50, -10], [95, 20, 200], [85, 45, 190]] as [number, number, number][]).map(([x, y, a], i) => (
      <path key={i} transform={`translate(${x} ${y}) rotate(${a})`} d="M0 0 C10 -20 40 -22 60 -6 C40 2 14 6 0 0Z" fill={i % 2 ? '#1b5e20' : '#2e7d32'} stroke="#0d3b12" strokeWidth={1} />
    ))}
    {/* Guacamaya */}
    <motion.g transform="translate(-20 -10)" animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }}>
      <path d="M-30 6 H30" stroke="#5d4037" strokeWidth={3} strokeLinecap="round" />
      <path d="M0 4 C-10 -6 -8 -24 2 -28 C12 -26 12 -10 6 4Z" fill="#e53935" />
      <path d="M2 -2 C-6 2 -10 14 -12 30 L-4 28 C-2 16 2 8 6 2Z" fill="#1e88e5" />
      <path d="M-2 -6 C-12 -2 -14 6 -12 14 L-6 10 C-6 4 -4 0 0 -2Z" fill="#fdd835" />
      <circle cx={4} cy={-21} r={2.5} fill="#fff" />
      <circle cx={4.6} cy={-21} r={1.2} fill="#000" />
      <path d="M8 -20 C13 -20 13 -14 9 -13Z" fill="#212121" />
    </motion.g>
    {/* Tucán */}
    <g transform="translate(50 -20)">
      <ellipse cx={0} cy={0} rx={8} ry={11} fill="#212121" />
      <ellipse cx={1} cy={-4} rx={5} ry={4} fill="#fff59d" />
      <path d="M4 -7 C16 -10 22 -4 18 0 C12 -2 8 -2 4 -3Z" fill="#ff9800" />
      <circle cx={2} cy={-7} r={1.2} fill="#000" />
    </g>
  </g>
);

const Llanos: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#5b2c6f'], [35, '#e8594f'], [65, '#ffb347'], [100, '#ffe29a']])}
      {lin(`${p}land`, [[0, '#a1662f'], [100, '#5d3a1a']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <Sun x={0} y={18} r={30} color="#ffcf3f" glow="#ffe8a3" />
    {([[-40, -50], [-25, -58], [30, -45]] as [number, number][]).map(([x, y], i) => <Bird key={i} x={x} y={y} s={0.9} />)}
    <rect x={-100} y={30} width={200} height={70} fill={`url(#${p}land)`} />
    <rect x={-100} y={30} width={200} height={6} fill="#c9853f" opacity={0.6} />
    <path d="M-100 62 Q-20 52 40 66 T100 60 V70 Q40 76 -20 68 T-100 74Z" fill="#ffb347" opacity={0.55} />
    {/* Palmas de moriche */}
    {([[-75, 34, 1.1], [-55, 34, 0.8], [62, 34, 1], [80, 34, 0.75]] as [number, number, number][]).map(([x, y, s], i) => (
      <Palm key={i} x={x} y={y} s={s} trunk="#2a1408" leaf="#2a1408" flip={i % 2 === 1} />
    ))}
    {/* Llanero a caballo */}
    <g transform="translate(-10 34) scale(0.9)" fill="#1a0a04">
      <path d="M-16 0 L-14 -12 C-10 -16 6 -16 12 -12 L18 -20 L22 -18 L18 -10 L16 0 L13 0 L12 -8 L-8 -8 L-10 0Z" />
      <path d="M-14 -11 L-20 -6 L-18 -4Z" />
      <path d="M-2 -14 L-4 -24 L2 -26 L4 -16Z" />
      <circle cx={0} cy={-28} r={3} />
      <path d="M-6 -30 H6 L4 -32 H-4Z" />
    </g>
  </g>
);

const Salsa: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#120338'], [60, '#4a0e6e'], [100, '#b0124b']])}
      <radialGradient id={`${p}ball`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#8e8e8e" />
      </radialGradient>
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    {Array.from({ length: 18 }, (_, i) => (
      <motion.circle key={i} cx={-90 + ((i * 37) % 180)} cy={-90 + ((i * 53) % 70)} r={1.2} fill="#fff" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }} />
    ))}
    {/* Cerro y Cristo Rey */}
    <path d="M-100 20 Q-60 -20 -30 10 Q0 -30 30 5 Q60 -10 100 15 V100 H-100Z" fill="#1d0b3a" />
    <g transform="translate(0 -16)" fill="#e9d8ff">
      <rect x={-1.5} y={-14} width={3} height={14} />
      <rect x={-8} y={-11} width={16} height={2.5} />
      <circle cx={0} cy={-16} r={2} />
    </g>
    {/* Edificios con ventanas */}
    {Array.from({ length: 9 }, (_, i) => {
      const x = -100 + i * 23;
      const h = 30 + ((i * 17) % 28);
      return (
        <g key={i}>
          <rect x={x} y={60 - h} width={20} height={h + 40} fill="#2b0f4f" />
          {Array.from({ length: Math.floor(h / 8) }, (_, k) => (
            <rect key={k} x={x + 4 + (k % 2) * 8} y={64 - h + k * 8} width={4} height={4} fill={k % 3 ? '#ffd166' : '#ff5fa2'} opacity={0.85} />
          ))}
        </g>
      );
    })}
    {/* Pareja bailando */}
    <motion.g transform="translate(0 74)" animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 1.2, repeat: Infinity }}>
      <circle cx={-6} cy={-30} r={4} fill="#ffe0e9" />
      <path d="M-6 -26 L-8 -10 L-14 6 M-8 -10 L-2 6 M-6 -22 L2 -26" stroke="#ffe0e9" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={8} cy={-31} r={4} fill="#ffd0e0" />
      <path d="M8 -27 L6 -14 C0 -10 2 -4 16 -2 C18 -8 12 -12 10 -14 M7 -23 L2 -26 M8 -22 L16 -30" stroke="#ff2e88" strokeWidth={2.5} fill="#ff2e88" strokeLinecap="round" />
    </motion.g>
    {/* Bola de discoteca */}
    <motion.g transform="translate(55 -55)" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
      <line x1={0} y1={-20} x2={0} y2={-10} stroke="#ccc" />
      <circle r={10} fill={`url(#${p}ball)`} />
      {[-6, 0, 6].map((x) => <line key={x} x1={x} y1={-9} x2={x} y2={9} stroke="#666" strokeWidth={0.5} />)}
      {[-6, 0, 6].map((y) => <line key={y} x1={-9} y1={y} x2={9} y2={y} stroke="#666" strokeWidth={0.5} />)}
    </motion.g>
    {['♪', '♫', '♪'].map((n, i) => (
      <motion.text key={i} x={-60 + i * 40} y={-30} fill={['#ffd166', '#5ee7ff', '#ff5fa2'][i]} fontSize={16} animate={{ y: [-30, -45, -30], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}>
        {n}
      </motion.text>
    ))}
  </g>
);

const Silletas: SceneFn = ({ p }) => {
  const cols = ['#e91e63', '#ffeb3b', '#ff5722', '#9c27b0', '#ffffff', '#f44336', '#ff9800', '#03a9f4'];
  return (
    <g>
      <defs>{lin(`${p}sky`, [[0, '#ffd6ea'], [100, '#fff6fb']])}</defs>
      <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
      <path d="M-100 0 L-70 -40 L-40 -15 L-10 -50 L25 -12 L60 -42 L100 -8 V100 H-100Z" fill="#a5d6a7" />
      <path d="M-100 30 Q-30 0 40 25 T100 20 V100 H-100Z" fill="#66bb6a" />
      {/* Silleta: armazón de madera con flores */}
      <g transform="translate(0 20)">
        <rect x={-48} y={-46} width={96} height={70} rx={6} fill="#8d6e63" stroke="#4e342e" strokeWidth={2} />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1={-48} y1={-36 + i * 12} x2={48} y2={-36 + i * 12} stroke="#5d4037" strokeWidth={1.5} />)}
        {Array.from({ length: 40 }, (_, i) => (
          <Flower key={i} x={-42 + (i % 8) * 12 + ((Math.floor(i / 8) % 2) * 6)} y={-40 + Math.floor(i / 8) * 13} r={5.5} color={cols[(i * 3) % cols.length]!} center={i % 2 ? '#ffd54f' : '#fff'} />
        ))}
        <path d="M-30 24 L-34 40 M30 24 L34 40" stroke="#4e342e" strokeWidth={3} />
      </g>
      {([[-80, 70], [-65, 82], [70, 74], [85, 64]] as [number, number][]).map(([x, y], i) => <Flower key={i} x={x} y={y} r={5} color={cols[i]!} />)}
    </g>
  );
};

const Guatape: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#7cc7f5'], [100, '#e3f6ff']])}
      {lin(`${p}lake`, [[0, '#1e88e5'], [100, '#0d47a1']])}
      {lin(`${p}rock`, [[0, '#9e9e9e'], [100, '#5f5f5f']], false)}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <Sun x={-60} y={-55} r={12} />
    <path d="M-100 30 Q-60 10 -20 26 T60 22 T100 26 V100 H-100Z" fill="#7cb342" />
    {/* El Peñol */}
    <path d="M-28 30 C-34 0 -30 -40 -10 -58 C10 -66 28 -50 30 -20 C32 5 28 22 26 30Z" fill={`url(#${p}rock)`} stroke="#424242" strokeWidth={1} />
    <path d="M-10 -58 C-4 -40 -6 -10 -2 30" stroke="#757575" strokeWidth={2} fill="none" />
    <path d="M18 28 l-6 -6 l6 -6 l-6 -6 l6 -6 l-6 -6 l6 -6 l-6 -6 l6 -6 l-6 -6 l6 -6" stroke="#fff" strokeWidth={1.4} fill="none" />
    <rect x={-6} y={-66} width={12} height={8} fill="#eeeeee" />
    {/* Represa con islas */}
    <path d="M-100 40 Q0 30 100 40 V100 H-100Z" fill={`url(#${p}lake)`} />
    {([[-60, 52, 18], [40, 58, 22], [-10, 74, 14], [75, 80, 12]] as [number, number, number][]).map(([x, y, w], i) => (
      <g key={i}>
        <ellipse cx={x} cy={y} rx={w} ry={4} fill="#558b2f" />
        <ellipse cx={x} cy={y - 3} rx={w * 0.6} ry={4} fill="#33691e" />
      </g>
    ))}
    {/* Zócalos de colores */}
    {['#e53935', '#fdd835', '#1e88e5', '#43a047', '#8e24aa'].map((c, i) => (
      <g key={i} transform={`translate(${-95 + i * 12} 30)`}>
        <rect x={0} y={-10} width={11} height={10} fill="#fff" />
        <rect x={0} y={-4} width={11} height={4} fill={c} />
        <path d="M-1 -10 L5.5 -15 L12 -10Z" fill="#bf360c" />
      </g>
    ))}
    <motion.g animate={{ x: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
      <path d="M5 66 h16 l-3 4 h-10z" fill="#fff" />
      <path d="M12 66 V58 l6 6z" fill="#ff7043" />
    </motion.g>
  </g>
);

const Tejo: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#9fd3f5'], [100, '#e8f6ff']])}
      {lin(`${p}clay`, [[0, '#9b6b43'], [100, '#5e3c22']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <path d="M-100 -10 Q-50 -40 0 -15 T100 -20 V100 H-100Z" fill="#7cb342" />
    <path d="M-100 10 Q-30 -10 30 8 T100 5 V100 H-100Z" fill="#558b2f" />
    {/* Cancha de arcilla con bocín y mechas */}
    <g transform="translate(0 30)">
      <path d="M-50 40 L-34 -20 H34 L50 40Z" fill="#5d4037" />
      <path d="M-42 34 L-28 -14 H28 L42 34Z" fill={`url(#${p}clay)`} />
      <ellipse cx={0} cy={6} rx={12} ry={5} fill="#3e2723" stroke="#bdbdbd" strokeWidth={1.5} />
      {([[-8, 0], [8, 0], [0, -6], [0, 11]] as [number, number][]).map(([x, y], i) => (
        <motion.path key={i} d={`M${x - 4} ${y + 3} L${x} ${y - 4} L${x + 4} ${y + 3}Z`} fill="#fafafa" stroke="#d32f2f" strokeWidth={1.4}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </g>
    {/* Tejo volando */}
    <motion.g animate={{ x: [-60, 0], y: [-30, 30], rotate: [0, 360] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeIn' }}>
      <ellipse rx={9} ry={5} fill="#9e9e9e" stroke="#424242" strokeWidth={1.2} />
      <ellipse rx={5} ry={2.5} fill="#bdbdbd" />
    </motion.g>
    <motion.text x={30} y={-40} fontSize={20} animate={{ scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.3, repeat: Infinity }}>
      💥
    </motion.text>
  </g>
);

const Cielo: SceneFn = ({ p }) => (
  <g>
    <defs>
      {lin(`${p}sky`, [[0, '#7986cb'], [60, '#c5cae9'], [100, '#ffffff']])}
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    {['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].map((c, i) => (
      <path key={c} d={`M-90 60 A${90 - i * 6} ${70 - i * 6} 0 0 1 ${90 - i * 12} 60`} fill="none" stroke={c} strokeWidth={6} opacity={0.75} />
    ))}
    {([[-50, -40, 1.2], [40, -20, 1], [-10, 30, 1.4], [60, 50, 0.9]] as [number, number, number][]).map(([x, y, s], i) => (
      <motion.g key={i} animate={{ x: [0, 8, 0] }} transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}>
        <g transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cx={0} cy={6} rx={26} ry={9} fill="#fff" />
          <circle cx={-10} cy={0} r={10} fill="#fff" />
          <circle cx={5} cy={-4} r={13} fill="#fff" />
          <circle cx={17} cy={2} r={8} fill="#fff" />
        </g>
      </motion.g>
    ))}
    {([[-30, -65], [20, -60], [70, -5], [-70, 10]] as [number, number][]).map(([x, y], i) => (
      <motion.path key={i} transform={`translate(${x} ${y})`} d="M-10 5 L-10 -5 L-5 0 L0 -8 L5 0 L10 -5 L10 5Z" fill="#ffca28" stroke="#8d6e00" strokeWidth={1}
        animate={{ y: [0, -5, 0], rotate: [-6, 6, -6] }} transition={{ duration: 2.5 + i * 0.4, repeat: Infinity }} />
    ))}
  </g>
);

const Carnaval: SceneFn = ({ p }) => (
  <g>
    <defs>{lin(`${p}sky`, [[0, '#ff7a00'], [50, '#ffcc33'], [100, '#fff3b0']])}</defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    {Array.from({ length: 30 }, (_, i) => (
      <motion.rect key={i} x={-95 + ((i * 41) % 190)} y={-95 + ((i * 29) % 190)} width={5} height={8} rx={1} fill={['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#ffffff'][i % 5]}
        animate={{ rotate: [0, 180, 360], y: [0, 6, 0] }} transition={{ duration: 3 + (i % 4), repeat: Infinity }} />
    ))}
    {/* Marimonda */}
    <g transform="translate(-35 10)">
      <ellipse cx={0} cy={0} rx={24} ry={30} fill="#1a237e" />
      <ellipse cx={0} cy={-6} rx={16} ry={18} fill="#fff" />
      <circle cx={-6} cy={-10} r={3} fill="#000" />
      <circle cx={6} cy={-10} r={3} fill="#000" />
      <path d="M0 -4 C-2 10 2 22 0 34" stroke="#e53935" strokeWidth={7} strokeLinecap="round" fill="none" />
      <ellipse cx={-22} cy={-18} rx={9} ry={14} fill="#e53935" />
      <ellipse cx={22} cy={-18} rx={9} ry={14} fill="#43a047" />
    </g>
    {/* Toro */}
    <g transform="translate(40 15)">
      <ellipse cx={0} cy={0} rx={20} ry={24} fill="#212121" />
      <path d="M-18 -18 C-30 -30 -30 -40 -22 -42 M18 -18 C30 -30 30 -40 22 -42" stroke="#fafafa" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={-7} cy={-6} r={4} fill="#fff" />
      <circle cx={7} cy={-6} r={4} fill="#fff" />
      <ellipse cx={0} cy={10} rx={10} ry={6} fill="#e53935" />
      {[-12, -4, 4, 12].map((x, i) => <circle key={x} cx={x} cy={-20} r={3} fill={['#fdd835', '#1e88e5', '#e53935', '#43a047'][i]} />)}
    </g>
    {/* Banderines */}
    <path d="M-100 -60 Q0 -40 100 -60" stroke="#5d4037" strokeWidth={1} fill="none" />
    {Array.from({ length: 10 }, (_, i) => {
      const x = -90 + i * 20;
      const y = -60 + Math.sin((i / 9) * Math.PI) * 18;
      return <path key={i} d={`M${x - 6} ${y} L${x + 6} ${y} L${x} ${y + 12}Z`} fill={['#fdd835', '#1e88e5', '#e53935'][i % 3]} />;
    })}
  </g>
);

const Navidad: SceneFn = ({ p }) => (
  <g>
    <defs>{lin(`${p}sky`, [[0, '#0b1a3a'], [100, '#1e3a8a']])}</defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sky)`} />
    <motion.path transform="translate(0 -55)" d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4Z" fill="#ffe066" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
    {/* Alumbrados en cadenas */}
    {[-30, -10].map((y0, k) => (
      <g key={y0}>
        <path d={`M-100 ${y0} Q0 ${y0 + 20} 100 ${y0}`} stroke="#333" strokeWidth={0.8} fill="none" />
        {Array.from({ length: 14 }, (_, i) => {
          const x = -95 + i * 14.5;
          const y = y0 + 20 * (1 - ((x / 100) ** 2)) * 0.5 + 2;
          return (
            <motion.circle key={i} cx={x} cy={y} r={2.6} fill={['#ff1744', '#00e676', '#ffea00', '#2979ff'][(i + k) % 4]}
              animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, delay: ((i + k) % 4) * 0.3 }} />
          );
        })}
      </g>
    ))}
    {/* Pesebre sencillo */}
    <g transform="translate(0 40)">
      <path d="M-30 0 L0 -26 L30 0Z" fill="#6d4c41" />
      <rect x={-24} y={0} width={48} height={22} fill="#8d6e63" />
      <circle cx={-8} cy={10} r={4} fill="#ffe0b2" />
      <circle cx={8} cy={10} r={4} fill="#ffe0b2" />
      <ellipse cx={0} cy={16} rx={6} ry={3} fill="#fff59d" />
    </g>
    {/* Velitas del 7 de diciembre */}
    {Array.from({ length: 9 }, (_, i) => {
      const x = -80 + i * 20;
      return (
        <g key={i}>
          <rect x={x - 2.5} y={74} width={5} height={14} fill={['#ffffff', '#ffcdd2', '#c8e6c9'][i % 3]} />
          <motion.ellipse cx={x} cy={70} rx={2.6} ry={5} fill="#ffb300" animate={{ scaleY: [1, 1.3, 0.9, 1] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.1 }} />
        </g>
      );
    })}
  </g>
);

function Cactus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={1} rx={11} ry={3} fill="rgba(90,50,10,.35)" />
      <path d="M-4 0 V-26 A4 4 0 0 1 4 -26 V0Z" fill="#3f9b3a" stroke="#1f5a1c" strokeWidth={1} />
      <path d="M-4 -12 H-9 V-20 A2.6 2.6 0 0 1 -4 -20" fill="none" stroke="#3f9b3a" strokeWidth={5} strokeLinecap="round" />
      <path d="M4 -16 H9 V-24 A2.6 2.6 0 0 1 4 -24" fill="none" stroke="#3f9b3a" strokeWidth={5} strokeLinecap="round" />
      <path d="M-1.5 -26 V-2 M1.5 -24 V-2" stroke="#2c7a28" strokeWidth={0.8} />
      {[-22, -15, -8].map((yy) => <path key={yy} d={`M-4 ${yy} l-2 -1 M4 ${yy + 3} l2 -1`} stroke="#e8f5c8" strokeWidth={0.6} />)}
      <circle cx={0} cy={-29} r={2.2} fill="#ff6fb5" />
    </g>
  );
}

function Rock({ x, y, s = 1, c = '#b5703a' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 2 L-5 -4 L1 -6 L7 -2 L8 2 Z" fill={c} stroke="rgba(60,30,5,.45)" strokeWidth={0.8} />
      <path d="M-5 -4 L1 -6 L1 0 Z" fill="rgba(255,255,255,.25)" />
    </g>
  );
}

/** Desierto de la Tatacoa (Huila): arena, cárcavas rojas, cactus y rocas. */
const Tatacoa: SceneFn = ({ p }) => (
  <g>
    <defs>
      <radialGradient id={`${p}sand`} cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#ffe9bf" />
        <stop offset="70%" stopColor="#f1c27d" />
        <stop offset="100%" stopColor="#d99a52" />
      </radialGradient>
    </defs>
    <rect x={-100} y={-100} width={200} height={200} fill={`url(#${p}sand)`} />
    {/* Ondas de arena */}
    {Array.from({ length: 9 }, (_, i) => (
      <path key={i} d={`M-100 ${-88 + i * 22} q25 -5 50 0 t50 0 t50 0 t50 0`} fill="none" stroke="rgba(170,100,40,.18)" strokeWidth={1.4} />
    ))}
    {/* Cárcavas rojas en las esquinas */}
    {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([sx, sy], i) => (
      <g key={i} transform={`translate(${sx * 74} ${sy * 74}) scale(${sx} ${sy})`}>
        <path d="M-26 -26 L26 -26 C14 -18 6 -6 -2 4 C-10 10 -18 18 -26 26Z" fill="#c7552c" opacity={0.55} />
        <path d="M-26 -26 L10 -26 C2 -18 -6 -10 -14 -2 C-18 4 -22 10 -26 14Z" fill="#9c3f1e" opacity={0.5} />
      </g>
    ))}
    <Cactus x={-80} y={-60} s={1.1} />
    <Cactus x={84} y={-70} s={0.9} />
    <Cactus x={-70} y={86} s={1} />
    <Cactus x={78} y={80} s={1.15} />
    <Cactus x={-90} y={20} s={0.6} />
    <Cactus x={92} y={10} s={0.65} />
    {([[-60, -86, 1.2], [-92, -40, 0.9], [62, -88, 1], [90, -46, 0.8], [-58, 70, 1.1], [-88, 64, 0.8], [58, 64, 1], [92, 58, 0.9], [-30, -94, 0.7], [30, 94, 0.8]] as [number, number, number][]).map(([x, y, s2], i) => (
      <Rock key={i} x={x} y={y} s={s2} c={i % 3 ? '#b5703a' : '#8e8a84'} />
    ))}
    {/* Centro: rosa de los vientos tallada en la arena */}
    <g opacity={0.35}>
      <circle r={16} fill="none" stroke="#8a4b16" strokeWidth={1.5} />
      <path d="M0 -20 L4 0 L0 20 L-4 0Z M-20 0 L0 -4 L20 0 L0 4Z" fill="#8a4b16" />
    </g>
  </g>
);

const SCENES: Record<ArtId, SceneFn> = {
  tatacoa: Tatacoa,
  playa: Playa,
  cafetal: Cafetal,
  cartagena: Cartagena,
  selva: Selva,
  llanos: Llanos,
  salsa: Salsa,
  silletas: Silletas,
  guatape: Guatape,
  tejo: Tejo,
  cielo: Cielo,
  carnaval: Carnaval,
  navidad: Navidad,
};

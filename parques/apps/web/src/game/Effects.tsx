import { AnimatePresence, motion } from 'framer-motion';
import type { Fx } from '../stores/gameStore';

/** Explosión de estrellas, corona, flash de cárcel y anillo de salida. */
export function FxLayer({ fx, rot }: { fx: Fx[]; rot: number }) {
  return (
    <g pointerEvents="none">
      <AnimatePresence>
        {fx.map((f) => (
          <g key={f.id} transform={`translate(${f.at.x} ${f.at.y}) rotate(${-rot})`}>
            {f.kind === 'burst' ? <Burst color={f.color} /> : null}
            {f.kind === 'crown' ? <CrownFx /> : null}
            {f.kind === 'jail' ? <JailFx color={f.color} /> : null}
            {f.kind === 'exit' ? <Ring color={f.color} /> : null}
          </g>
        ))}
      </AnimatePresence>
    </g>
  );
}

const STAR = 'M0 -10 L2.6 -3.2 L9.5 -3.1 L4 1.2 L5.9 8.1 L0 4 L-5.9 8.1 L-4 1.2 L-9.5 -3.1 L-2.6 -3.2 Z';

function Burst({ color }: { color: string }) {
  return (
    <g>
      <motion.circle r={20} fill="none" stroke="#fff" strokeWidth={6} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.6 }} />
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i / 12) * Math.PI * 2;
        const d = 70 + (i % 3) * 18;
        return (
          <motion.path
            key={i}
            d={STAR}
            fill={i % 2 ? '#ffcf3f' : color}
            stroke="#2a1400"
            strokeWidth={1}
            initial={{ x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 }}
            animate={{ x: Math.cos(t) * d, y: Math.sin(t) * d, scale: 1.5, rotate: 180, opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          />
        );
      })}
    </g>
  );
}

function CrownFx() {
  return (
    <motion.g initial={{ y: 0, scale: 0.4, opacity: 0 }} animate={{ y: -60, scale: 2.2, opacity: [0, 1, 1, 0] }} transition={{ duration: 1.1, ease: 'easeOut' }}>
      <path d="M-14 6 L-14 -8 L-7 -2 L0 -12 L7 -2 L14 -8 L14 6 Z" fill="#ffcf3f" stroke="#7a4b00" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={0} cy={1} r={2.5} fill="#ff3b4e" />
    </motion.g>
  );
}

function JailFx({ color }: { color: string }) {
  return (
    <g>
      <motion.circle r={26} fill={color} initial={{ scale: 1.6, opacity: 0.8 }} animate={{ scale: 0.2, opacity: 0 }} transition={{ duration: 0.7 }} />
      <motion.path d="M-16 -16 L16 16 M16 -16 L-16 16" stroke="#fff" strokeWidth={7} strokeLinecap="round" initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.8 }} />
    </g>
  );
}

function Ring({ color }: { color: string }) {
  return <motion.circle r={22} fill="none" stroke={color} strokeWidth={6} initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.6 }} />;
}

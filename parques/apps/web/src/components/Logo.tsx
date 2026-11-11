import { motion } from 'framer-motion';
import { Sombrero } from '../game/Board';

/** Logo original de Parqués Bacano: dado con sombrero vueltiao + letras en los 4 colores. */
export function Logo({ size = 1 }: { size?: number }) {
  const letters = 'BACANO'.split('');
  const colors = ['amarillo', 'azul', 'rojo', 'verde', 'amarillo', 'azul'];
  return (
    <div className="logo" style={{ fontSize: `${size}rem` }}>
      <motion.svg
        viewBox="-50 -62 100 112"
        className="logo-die"
        animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x={-34} y={-30} width={68} height={68} rx={16} fill="#fff8ec" stroke="#2a1400" strokeWidth={4} />
        <circle cx={-15} cy={-11} r={6.5} fill="var(--rojo)" />
        <circle cx={15} cy={-11} r={6.5} fill="var(--azul)" />
        <circle cx={0} cy={4} r={6.5} fill="#2a1400" />
        <circle cx={-15} cy={19} r={6.5} fill="var(--verde)" />
        <circle cx={15} cy={19} r={6.5} fill="var(--amarillo)" />
        <g transform="translate(0 -36) rotate(-8)">
          <Sombrero size={48} />
        </g>
      </motion.svg>
      <div className="logo-text">
        <span className="logo-small">Parqués</span>
        <span className="logo-big">
          {letters.map((l, i) => (
            <motion.span
              key={i}
              style={{ color: `var(--${colors[i]})` }}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 500, damping: 14 }}
            >
              {l}
            </motion.span>
          ))}
        </span>
      </div>
    </div>
  );
}

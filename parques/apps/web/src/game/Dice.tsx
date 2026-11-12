import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { DiceSkin } from '@parques/engine';
import { useT } from '../lib/i18n';

const DEFAULT_SKIN: DiceSkin = { face: ['#ffffff', '#efe3c8'], pip: '#2a1400', one: '#e8112d' };

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

/** Caras del cubo: frente 1, atrás 6, derecha 3, izquierda 4, arriba 5, abajo 2 (opuestas suman 7). */
const FACES: { v: number; t: (h: number) => string }[] = [
  { v: 1, t: (h) => `translateZ(${h}px)` },
  { v: 6, t: (h) => `rotateY(180deg) translateZ(${h}px)` },
  { v: 3, t: (h) => `rotateY(90deg) translateZ(${h}px)` },
  { v: 4, t: (h) => `rotateY(-90deg) translateZ(${h}px)` },
  { v: 5, t: (h) => `rotateX(90deg) translateZ(${h}px)` },
  { v: 2, t: (h) => `rotateX(-90deg) translateZ(${h}px)` },
];
/** Rotación del cubo para mostrar cada valor al frente. */
const ORIENT: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };

function Face({ value, skin, size }: { value: number; skin: DiceSkin; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id={`pip-${value}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,.35)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      {PIPS[value]!.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y + 1.5} r={value === 1 ? 13 : 10} fill="rgba(0,0,0,.25)" />
          <circle cx={x} cy={y} r={value === 1 ? 13 : 10} fill={value === 1 ? skin.one : skin.pip} />
          <circle cx={x} cy={y} r={value === 1 ? 13 : 10} fill={`url(#pip-${value})`} />
        </g>
      ))}
    </svg>
  );
}

/** Dado 3D (cubo CSS) que gira y cae en `value`. */
export function Cube({ value, skin = DEFAULT_SKIN, size = 58, rolling = false, used = false, delay = 0, tilt = true }: { value: number; skin?: DiceSkin; size?: number; rolling?: boolean; used?: boolean; delay?: number; tilt?: boolean }) {
  const spins = useRef(0);
  const wasRolling = useRef(rolling);
  if (wasRolling.current && !rolling) spins.current += 1;
  wasRolling.current = rolling;
  const [rx, ry] = ORIENT[value] ?? [0, 0];
  const h = size / 2;
  const edge = skin.edge ?? 'rgba(0,0,0,.18)';
  return (
    <div className="cube-wrap" style={{ width: size, height: size, opacity: used && !rolling ? 0.4 : 1 }}>
      <motion.div
        className="cube"
        style={{ width: size, height: size }}
        animate={
          rolling
            ? { rotateX: [0, 360], rotateY: [0, 360], y: [0, -26, 0] }
            : { rotateX: rx + (tilt ? -16 : 0) + 720 * spins.current, rotateY: ry + (tilt ? 22 : 0) + 720 * spins.current, y: 0 }
        }
        transition={rolling ? { duration: 0.45, repeat: Infinity, ease: 'linear', delay } : { type: 'spring', stiffness: 120, damping: 14, mass: 0.8 }}
      >
        {FACES.map((f) => (
          <div
            key={f.v}
            className="cube-face"
            style={{
              width: size,
              height: size,
              transform: f.t(h),
              background: `radial-gradient(circle at 30% 25%, ${skin.face[0]}, ${skin.face[1]})`,
              boxShadow: `inset 0 0 0 2px ${edge}, inset 0 -5px 8px rgba(0,0,0,.1), inset 0 4px 8px rgba(255,255,255,.6)`,
            }}
          >
            <Face value={f.v} skin={skin} size={size} />
          </div>
        ))}
      </motion.div>
      <div className="cube-shadow" />
    </div>
  );
}

/** Cara de dado estática (se usa en la tienda): un cubo 3D quieto. */
export function DieFace({ value, skin, size = 60 }: { value: number; skin: DiceSkin; size?: number }) {
  return <Cube value={value} skin={skin} size={size} />;
}

interface Props {
  dice: [number, number] | null;
  used: [boolean, boolean];
  rolling: boolean;
  canRoll: boolean;
  tint: string;
  skin?: DiceSkin;
  onRoll: () => void;
}

export function Dice({ dice, used, rolling, canRoll, tint, skin = DEFAULT_SKIN, onRoll }: Props) {
  const t = useT();
  const [a, b] = dice ?? [5, 6];
  const prev = useRef(rolling);
  useEffect(() => {
    prev.current = rolling;
  }, [rolling]);
  return (
    <motion.button
      className={`dice-tray ${canRoll ? 'can-roll' : ''}`}
      onClick={canRoll ? onRoll : undefined}
      whileTap={canRoll ? { scale: 0.92 } : undefined}
      aria-label={canRoll ? t('Tirar los dados') : t('Dados')}
      disabled={!canRoll}
      style={{ ['--tint' as string]: tint }}
    >
      <Cube value={a} skin={skin} rolling={rolling} used={!!dice && used[0]} />
      <Cube value={b} skin={skin} rolling={rolling} used={!!dice && used[1]} delay={0.05} />
      {canRoll ? (
        <motion.span className="roll-hint" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}>
          {t('¡Toca para tirar!')}
        </motion.span>
      ) : null}
    </motion.button>
  );
}

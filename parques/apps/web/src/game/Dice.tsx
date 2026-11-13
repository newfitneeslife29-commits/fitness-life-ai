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
  const edge = skin.edge ?? 'rgba(0,0,0,.38)';
  return (
    <div className={`cube-wrap ${used && !rolling ? 'used' : ''}`} style={{ width: size, height: size }}>
      <motion.div
        className="cube"
        style={{ width: size, height: size }}
        animate={
          rolling
            ? // Agitando en el vaso: volteretas en los 3 ejes con saltitos.
              { rotateX: [0, 200, 420, 720], rotateY: [0, 300, 480, 720], rotateZ: [0, 90, -60, 0], y: [0, -size * 0.45, -size * 0.1, -size * 0.35, 0], x: [0, size * 0.12, -size * 0.12, 0] }
            : // Cae: gira hasta su cara y rebota dos veces antes de quedarse quieto.
              {
                rotateX: rx + (tilt ? -16 : 0) + 720 * spins.current,
                rotateY: ry + (tilt ? 22 : 0) + 720 * spins.current,
                rotateZ: 0,
                x: 0,
                y: spins.current ? [-size * 0.9, 0, -size * 0.28, 0, -size * 0.08, 0].map((v) => v + (spins.current % 2) * 0.001) : 0,
              }
        }
        transition={
          rolling
            ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut', delay }
            : {
                rotateX: { type: 'spring', stiffness: 140, damping: 13, mass: 0.8, delay },
                rotateY: { type: 'spring', stiffness: 140, damping: 13, mass: 0.8, delay },
                y: { duration: 0.75, times: [0, 0.38, 0.58, 0.76, 0.88, 1], ease: 'easeOut', delay },
              }
        }
      >
        {FACES.map((f) => (
          <div
            key={f.v}
            className={`cube-face ${skin.anim ? `anim-${skin.anim}` : ''}`}
            style={{
              width: size,
              height: size,
              transform: f.t(h),
              background: skin.texture
                ? `radial-gradient(circle at 30% 25%, rgba(255,255,255,.35), rgba(0,0,0,.12)), url(art/dice/${skin.texture}.webp) center / cover`
                : `radial-gradient(circle at 30% 25%, ${skin.face[0]}, ${skin.face[1]})`,
              boxShadow: `inset 0 0 0 3px ${edge}, inset 0 -6px 10px rgba(0,0,0,.22), inset 0 3px 5px rgba(255,255,255,.35)`,
            }}
          >
            <Face value={f.v} skin={skin} size={size} />
          </div>
        ))}
      </motion.div>
      <motion.div
        className="cube-shadow"
        animate={rolling ? { scale: [1, 0.6, 0.9, 0.65, 1], opacity: [0.9, 0.5, 0.8, 0.55, 0.9] } : { scale: 1, opacity: 0.9 }}
        transition={rolling ? { duration: 0.55, repeat: Infinity, delay } : { duration: 0.3 }}
      />
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

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { DiceSkin } from '../meta/catalog';

const DEFAULT_SKIN: DiceSkin = { face: ['#ffffff', '#f3e6cc'], pip: '#2a1400', one: '#e8112d' };

/** Cara de dado estática (vista previa de la tienda). */
export function DieFace({ value, skin, size = 60 }: { value: number; skin: DiceSkin; size?: number }) {
  return (
    <div className="die" style={{ width: size, height: size, background: `linear-gradient(160deg, ${skin.face[0]}, ${skin.face[1]})`, ['--tint' as string]: skin.pip }}>
      <svg viewBox="0 0 100 100">
        {PIPS[value]!.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={value === 1 ? 13 : 10} fill={value === 1 ? skin.one : skin.pip} />
        ))}
      </svg>
    </div>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

function Die({ value, used, rolling, delay, tint, skin }: { value: number; used: boolean; rolling: boolean; delay: number; tint: string; skin: DiceSkin }) {
  const [face, setFace] = useState(value);
  useEffect(() => {
    if (!rolling) {
      setFace(value);
      return;
    }
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    return () => clearInterval(id);
  }, [rolling, value]);

  return (
    <motion.div
      className="die"
      animate={
        rolling
          ? { rotate: [0, 120, 260, 360], y: [0, -38, -10, 0], scale: [1, 1.12, 0.95, 1] }
          : { rotate: 0, y: 0, scale: 1, opacity: used ? 0.38 : 1 }
      }
      transition={rolling ? { duration: 0.6, delay, ease: 'easeOut' } : { type: 'spring', stiffness: 400, damping: 15 }}
      style={{ ['--tint' as string]: tint, background: `linear-gradient(160deg, ${skin.face[0]}, ${skin.face[1]})` }}
    >
      <svg viewBox="0 0 100 100">
        {PIPS[face]!.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={face === 1 ? 13 : 10} fill={face === 1 ? skin.one : skin.pip} />
        ))}
      </svg>
    </motion.div>
  );
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
  const [a, b] = dice ?? [6, 6];
  return (
    <motion.button
      className={`dice-tray ${canRoll ? 'can-roll' : ''}`}
      onClick={canRoll ? onRoll : undefined}
      whileTap={canRoll ? { scale: 0.92 } : undefined}
      aria-label={canRoll ? 'Tirar los dados' : 'Dados'}
      disabled={!canRoll}
    >
      <Die value={a} used={!rolling && !!dice && used[0]} rolling={rolling} delay={0} tint={tint} skin={skin} />
      <Die value={b} used={!rolling && !!dice && used[1]} rolling={rolling} delay={0.05} tint={tint} skin={skin} />
      {canRoll ? (
        <motion.span className="roll-hint" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}>
          ¡Toca para tirar!
        </motion.span>
      ) : null}
    </motion.button>
  );
}

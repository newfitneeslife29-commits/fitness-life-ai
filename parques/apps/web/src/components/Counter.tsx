import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

/** Número que sube/baja animado (contadores de monedas y gemas). */
export function useCountUp(value: number, ms = 700): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function fmtNum(n: number): string {
  return n >= 100000 ? `${Math.floor(n / 1000)}k` : n.toLocaleString('es-CO');
}

export function CurrencyPill({ kind, value, onPlus }: { kind: 'coin' | 'gem'; value: number; onPlus?: () => void }) {
  const shown = useCountUp(value);
  const controls = useAnimationControls();
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) controls.start({ scale: [1, 1.18, 1], transition: { duration: 0.35, delay: 0.8 } });
    prev.current = value;
  }, [value, controls]);
  return (
    <motion.div className={`pill pill-${kind}`} animate={controls}>
      <span className="pill-icon" data-fly-target={kind}>{kind === 'coin' ? <CoinIcon /> : <GemIcon />}</span>
      <span className="pill-val">{fmtNum(shown)}</span>
      {onPlus ? (
        <button className="pill-plus" onClick={onPlus} aria-label="Conseguir más">
          +
        </button>
      ) : null}
    </motion.div>
  );
}

export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#c98a00" />
      <circle cx="12" cy="11" r="10" fill="#ffcf3f" />
      <circle cx="12" cy="11" r="7" fill="none" stroke="#e0a400" strokeWidth="1.6" />
      <text x="12" y="15" textAnchor="middle" fontSize="10" fontWeight="900" fill="#a86f00" fontFamily="Nunito">$</text>
    </svg>
  );
}

export function GemIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 3h12l4 6-10 13L2 9z" fill="#19b86b" />
      <path d="M6 3h12l4 6H2z" fill="#4ff0a0" />
      <path d="M9 9l3 13 3-13" fill="#13a35d" />
      <path d="M8 4.5l-2 4h4z" fill="#b6ffd8" opacity=".8" />
    </svg>
  );
}

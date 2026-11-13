import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

const FLAG_COLORS = ['#ffc928', '#2f7bff', '#ff3b4e', '#22c55e', '#ff7ac8', '#a78bfa'];

/**
 * Fondo animado de fiesta (registro, inicio de sesión y carga): la plaza ilustrada con zoom lento,
 * guirnaldas que se mecen, luces que titilan, pétalos y confeti que caen y luciérnagas.
 * Todo con transform/opacity para que vaya fluido en celulares de gama media.
 */
export const FiestaBackdrop = memo(function FiestaBackdrop() {
  const petals = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i * 0.9) % 9,
        dur: 8 + ((i * 13) % 7),
        size: 10 + ((i * 7) % 12),
        color: FLAG_COLORS[i % FLAG_COLORS.length],
        petal: i % 3 === 0,
      })),
    [],
  );
  const flies = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ left: 8 + ((i * 53) % 84), top: 30 + ((i * 29) % 55), delay: (i * 0.7) % 5, dur: 4 + (i % 4) })),
    [],
  );
  return (
    <div className="fiesta-bg" aria-hidden>
      <motion.div
        className="fiesta-photo"
        style={{ backgroundImage: 'url(art/welcome.webp)' }}
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: [1.12, 1.2, 1.12], x: ['0%', '-2%', '0%'], opacity: 1 }}
        transition={{ scale: { duration: 26, repeat: Infinity, ease: 'easeInOut' }, x: { duration: 26, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2 } }}
      />
      <div className="fiesta-veil" />
      {/* guirnaldas */}
      {[0, 1].map((row) => (
        <motion.svg
          key={row}
          className={`fiesta-bunting r${row}`}
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          animate={{ rotate: row ? [1.5, -1.5, 1.5] : [-1, 1, -1], y: [0, 4, 0] }}
          transition={{ duration: 4 + row, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M0 6 Q200 46 400 6" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" />
          {Array.from({ length: 14 }, (_, i) => {
            const x = 14 + i * 27.5;
            const y = 6 + 40 * (1 - Math.pow((x - 200) / 200, 2)) * 0.98;
            return <polygon key={i} points={`${x - 9},${y} ${x + 9},${y} ${x},${y + 16}`} fill={FLAG_COLORS[(i + row * 2) % FLAG_COLORS.length]} stroke="rgba(0,0,0,.25)" strokeWidth="0.8" />;
          })}
          {Array.from({ length: 9 }, (_, i) => {
            const x = 25 + i * 44;
            const y = 6 + 40 * (1 - Math.pow((x - 200) / 200, 2)) * 0.98;
            return <circle key={`b${i}`} className="fiesta-bulb" style={{ animationDelay: `${(i * 0.37) % 2}s` }} cx={x} cy={y + 1} r="3.2" fill="#fff3b0" />;
          })}
        </motion.svg>
      ))}
      {/* luciérnagas */}
      {flies.map((f, i) => (
        <motion.span
          key={i}
          className="fiesta-fly"
          style={{ left: `${f.left}%`, top: `${f.top}%` }}
          animate={{ opacity: [0, 1, 0], x: [0, 14, -10, 0], y: [0, -18, -6, 0], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* confeti y pétalos */}
      {petals.map((p, i) => (
        <span
          key={i}
          className={`fiesta-fall ${p.petal ? 'petal' : ''}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.petal ? p.size : p.size * 0.45, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
        />
      ))}
    </div>
  );
});

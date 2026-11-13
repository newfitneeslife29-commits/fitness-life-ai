import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { VictoryStyle } from '@parques/engine';

const GLYPHS: Partial<Record<VictoryStyle, string[]>> = {
  papayera: ['🎺', '🎵', '🎶', '🥁', '🎷'],
  silletas: ['🌺', '🌼', '🌸', '💐', '🌻'],
  mariposas: ['🦋'],
  confeti: [],
};

/**
 * Celebración de victoria comprada en la tienda (categoría "Victorias").
 * Partículas con transform/opacity para que vaya fluido en celulares de gama media.
 */
export const VictoryFx = memo(function VictoryFx({ style }: { style: VictoryStyle }) {
  const parts = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ i, x: (i * 47) % 100, d: (i * 0.23) % 2.6, s: 0.7 + ((i * 13) % 7) / 10 })), []);
  if (style === 'confeti') return null; // el confeti de siempre ya lo dibuja la pantalla de victoria
  if (style === 'dadito')
    return (
      <div className="vfx" aria-hidden>
        <motion.img
          src="art/dadito-gana.webp"
          className="vfx-dadito"
          initial={{ y: 200, scale: 0.4 }}
          animate={{ y: 0, scale: 1, rotate: [0, -8, 8, 0] }}
          transition={{ y: { type: 'spring', stiffness: 160, damping: 12 }, rotate: { duration: 0.8, repeat: Infinity } }}
        />
      </div>
    );
  if (style === 'chiva')
    return (
      <div className="vfx" aria-hidden>
        <motion.div className="vfx-chiva" initial={{ x: '-40vw' }} animate={{ x: '120vw' }} transition={{ duration: 5, repeat: Infinity, repeatDelay: 1, ease: 'linear' }}>
          <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 0.35, repeat: Infinity }}>
            🚌
          </motion.span>
          <span className="vfx-chiva-trail">🎉🎊🎶</span>
        </motion.div>
      </div>
    );
  if (style === 'polvora')
    return (
      <div className="vfx" aria-hidden>
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className="vfx-burst" style={{ left: `${15 + k * 18}%`, top: `${12 + ((k * 23) % 30)}%` }}>
            {Array.from({ length: 12 }, (_, j) => (
              <motion.i
                key={j}
                style={{ background: ['#ffcf3f', '#ff3b4e', '#2f7bff', '#22c55e', '#f472b6'][(j + k) % 5] }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: Math.cos((j / 12) * Math.PI * 2) * 70, y: Math.sin((j / 12) * Math.PI * 2) * 70, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
                transition={{ duration: 1.4, delay: k * 0.45, repeat: Infinity, repeatDelay: 1.2 }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  const glyphs = GLYPHS[style] ?? ['✨'];
  const rising = style === 'papayera';
  return (
    <div className="vfx" aria-hidden>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="vfx-glyph"
          style={{ left: `${p.x}%`, fontSize: `${1.2 * p.s}rem`, filter: style === 'mariposas' ? 'hue-rotate(10deg) saturate(2) brightness(1.2)' : undefined }}
          initial={{ y: rising ? '105vh' : '-10vh', opacity: 0 }}
          animate={{ y: rising ? '-10vh' : '105vh', opacity: [0, 1, 1, 0], x: [0, 18, -14, 0], rotate: style === 'mariposas' ? [0, 15, -15, 0] : [0, 120, 240] }}
          transition={{ duration: 4 + p.s * 2, delay: p.d, repeat: Infinity, ease: 'linear' }}
        >
          {glyphs[p.i % glyphs.length]}
        </motion.span>
      ))}
    </div>
  );
});

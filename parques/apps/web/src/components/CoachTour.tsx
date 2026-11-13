import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { Mascot } from './Mascot';

import type { CoachStep } from '../game/tutorialData';
export type { CoachStep };

/**
 * Recorrido guiado: oscurece la pantalla, ilumina un elemento a la vez y Dadito explica para qué sirve.
 */
export function CoachTour({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i]!;

  useLayoutEffect(() => {
    const el = document.querySelector(step.sel) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const id = setTimeout(update, 350);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', update);
    };
  }, [step.sel]);

  useEffect(() => {
    play('turn');
  }, [i]);

  const next = () => {
    play('tap');
    if (i + 1 >= steps.length) onDone();
    else setI(i + 1);
  };

  const pad = 8;
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const below = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : true;

  return (
    <div className="coach-layer" onClick={next}>
      {hole ? (
        <motion.div className="coach-hole" initial={false} animate={hole} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <motion.span className="coach-ring" animate={{ scale: [1, 1.06, 1], opacity: [0.9, 0.4, 0.9] }} transition={{ duration: 1.4, repeat: Infinity }} />
        </motion.div>
      ) : (
        <div className="coach-dim" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="coach-bubble card glossy"
          style={hole ? (below ? { top: Math.min(hole.top + hole.height + 14, window.innerHeight - 220) } : { bottom: Math.max(window.innerHeight - hole.top + 14, 20) }) : { top: '35%' }}
          initial={{ y: below ? 20 : -20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Mascot size={58} className="coach-mascot" />
          <div className="coach-text">
            <b>{t(step.title)}</b>
            <p>{t(step.text)}</p>
            <div className="coach-actions">
              <span className="coach-count">
                {i + 1}/{steps.length}
              </span>
              <button className="link-btn" onClick={onDone}>
                {t('Saltar')}
              </button>
              <button className="btn3d green small" onClick={next}>
                {i + 1 >= steps.length ? t('¡A jugar!') : t('Siguiente')} ›
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


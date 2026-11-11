import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { TIPS } from '../game/phrases';
import { useApp } from '../stores/appStore';

/** Menú principal (el lobby completo llega en la fase 3). */
export function HomeScreen() {
  const openSetup = useApp((a) => a.openSetup);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="screen home-screen">
      <div className="home-deco" aria-hidden>
        <span>🌺</span>
        <span>☕</span>
        <span>🦜</span>
        <span>🌴</span>
      </div>
      <Logo size={1.1} />

      <motion.button className="btn3d play-btn" whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.03 }} onClick={() => openSetup('ai')}>
        ▶ JUGAR
        <small>contra la máquina</small>
      </motion.button>

      <div className="mode-grid">
        <motion.button className="btn3d blue" whileTap={{ scale: 0.93 }} onClick={() => openSetup('local')}>
          👨‍👩‍👧 Local
          <small>en el mismo celular</small>
        </motion.button>
        <motion.button className="btn3d purple" whileTap={{ scale: 0.93 }} onClick={() => openSetup('teams')}>
          🤝 Parejas
          <small>2 vs 2</small>
        </motion.button>
        <motion.button className="btn3d red" whileTap={{ scale: 0.93 }} onClick={() => openSetup('quick')}>
          ⚡ Rápido
          <small>2 fichas · 5 min</small>
        </motion.button>
        <button className="btn3d ghost" disabled>
          🌐 Online
          <small>próximamente</small>
        </button>
      </div>

      <div className="tip card">
        <span className="tip-label">💡 Tip</span>
        <AnimatePresence mode="wait">
          <motion.span key={tip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {TIPS[tip]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

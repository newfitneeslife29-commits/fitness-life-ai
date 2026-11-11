import { useT } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { TIPS } from '../game/phrases';
import { loadAudio } from '../audio/audio';
import { useApp } from '../stores/appStore';
import { useProfile } from '../stores/profileStore';
import { dailyStatus, dayKey } from '../meta/economy';

/** Pantalla de carga: logo animado, barra de progreso y tips. */
export function SplashScreen() {
  const t = useT();
  const go = useApp((a) => a.go);
  const setDailyOpen = useApp((a) => a.setDailyOpen);
  const [progress, setProgress] = useState(0.05);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2200);
    let alive = true;
    const minTime = new Promise((r) => setTimeout(r, 1800));
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve();
    Promise.all([loadAudio((p) => alive && setProgress(0.1 + p * 0.85)), fonts, minTime]).then(() => {
      if (!alive) return;
      setProgress(1);
      const p = useProfile.getState();
      p.refreshMissions();
      if (dailyStatus(p.daily.lastClaim, p.daily.streak, dayKey()).canClaim) setDailyOpen(true);
      setTimeout(() => go('lobby'), 350);
    });
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [go, setDailyOpen]);

  return (
    <div className="screen splash-screen">
      <div className="splash-glow" />
      <Logo size={1.15} />
      <div className="splash-bottom">
        <div className="loadbar">
          <motion.div className="loadbar-fill" animate={{ width: `${progress * 100}%` }} transition={{ ease: 'easeOut' }} />
          <span className="loadbar-dice">🎲</span>
        </div>
        <div className="splash-tip">
          <AnimatePresence mode="wait">
            <motion.p key={tip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              💡 {t(TIPS[tip]!)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

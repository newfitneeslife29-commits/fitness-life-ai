import { useT } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { TIPS } from '../game/phrases';
import { loadAudio } from '../audio/audio';
import { useApp } from '../stores/appStore';
import { useProfile } from '../stores/profileStore';
import { useOnline } from '../lib/online';
import { dailyStatus, dayKey } from '@parques/engine';
import { isOnboarded } from './WelcomeScreen';

/** Pantalla de carga: logo animado, barra de progreso y tips. */
export function SplashScreen() {
  const t = useT();
  const go = useApp((a) => a.go);
  const setDailyOpen = useApp((a) => a.setDailyOpen);
  const [progress, setProgress] = useState(0.05);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 2200);
    let alive = true;
    setOffline(false);
    const minTime = new Promise((r) => setTimeout(r, 1800));
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve();
    // El juego es online: hay que entrar a la cuenta del servidor antes del lobby.
    const login = useOnline.getState().connect();
    Promise.all([loadAudio((p) => alive && setProgress(0.1 + p * 0.8)), fonts, minTime, login]).then(([, , , ok]) => {
      if (!alive) return;
      if (!ok) {
        setOffline(true);
        return;
      }
      setProgress(1);
      // Primera vez: registro (nombre, avatar, país y cuenta de Apple/Google).
      if (!isOnboarded()) {
        setTimeout(() => go('welcome'), 350);
        return;
      }
      const p = useProfile.getState();
      if (dailyStatus(p.daily.lastClaim, p.daily.streak, dayKey()).canClaim) setDailyOpen(true);
      setTimeout(() => go('lobby'), 350);
    });
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [go, setDailyOpen, attempt]);

  if (offline) {
    return (
      <div className="screen splash-screen">
        <Logo size={0.9} />
        <div className="card glossy setup-card center offline-card">
          <span className="quick-hero">📡</span>
          <h3>{t('Sin conexión')}</h3>
          <p className="rule-note">{t('Parqués es un juego online: necesitas internet para jugar y guardar tu progreso.')}</p>
          <button className="btn3d green wide" onClick={() => setAttempt((x) => x + 1)}>
            {t('Reintentar')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen splash-screen">
      <div className="splash-glow" />
      <Logo size={1.15} />
      <Mascot size={150} className="splash-mascot" />
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

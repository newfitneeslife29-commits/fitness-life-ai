import { motion } from 'framer-motion';
import { useApp, type Screen } from '../stores/appStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

const ITEMS: { screen: Screen; icon: string; label: string; badge?: boolean }[] = [
  { screen: 'shop', icon: '🛍️', label: 'Tienda' },
  { screen: 'events', icon: '🎯', label: 'Eventos', badge: true },
  { screen: 'lobby', icon: '🏠', label: 'Inicio' },
  { screen: 'ranking', icon: '🏆', label: 'Ranking' },
  { screen: 'friends', icon: '👥', label: 'Amigos' },
];

export function BottomNav({ badges }: { badges?: Partial<Record<Screen, number>> }) {
  const { screen, go } = useApp();
  const t = useT();
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => {
        const active = screen === it.screen;
        const n = badges?.[it.screen] ?? 0;
        return (
          <motion.button key={it.screen} className={`nav-item ${active ? 'active' : ''}`} whileTap={{ scale: 0.85 }} onClick={() => { play('tap'); go(it.screen); }}>
            {active ? <motion.span layoutId="nav-glow" className="nav-glow" /> : null}
            <motion.span className="nav-icon" animate={active ? { y: -6, scale: 1.25 } : { y: 0, scale: 1 }}>
              {it.icon}
            </motion.span>
            <span className="nav-label">{t(it.label)}</span>
            {n > 0 ? <span className="nav-badge">{n}</span> : null}
          </motion.button>
        );
      })}
    </nav>
  );
}

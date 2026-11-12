import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { ACHIEVEMENTS, categoryProgress, roman, tierColor } from '@parques/engine';
import { levelFromXp } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { useT } from '../lib/i18n';

export function AchievementsScreen() {
  const t = useT();
  const p = useProfile();
  const [open, setOpen] = useState<string | null>(null);
  const ctx = { stats: p.stats, level: levelFromXp(p.xp).level, owned: p.owned.length, passTiers: p.passTiersTotal };
  const cats = categoryProgress(ctx, p.achievements);
  const total = Object.keys(p.achievements).length;

  return (
    <div className="screen achievements-screen">
      <TopBar back title={t('Logros')} />
      <div className="ach-summary card glossy">
        <span className="ach-big">🏅 {total.toLocaleString()}</span>
        <span>/ {ACHIEVEMENTS.length.toLocaleString()} {t('logros')}</span>
        <div className="xpbar big">
          <motion.div className="xpbar-fill" initial={false} animate={{ width: `${(total / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
      </div>
      <div className="ach-list">
        {cats.map(({ category: c, value, done, total: n, next }) => (
          <div key={c.key} className="ach-cat card glossy">
            <button className="ach-head" onClick={() => setOpen(open === c.key ? null : c.key)}>
              <span className="ach-emoji" style={{ background: tierColor(Math.max(1, done)) }}>{c.emoji}</span>
              <span className="ach-body">
                <b>{t(c.name)}</b>
                <small>{next !== undefined ? t(c.desc, { n: next.toLocaleString() }) : t('¡Categoría completa!')}</small>
                <span className="mi-bar">
                  <span className="mi-fill" style={{ width: `${next ? Math.min(100, (value / next) * 100) : 100}%`, display: 'block' }} />
                  <span>{next !== undefined ? `${value.toLocaleString()} / ${next.toLocaleString()}` : '✓'}</span>
                </span>
              </span>
              <span className="ach-count">{done}/{n}</span>
            </button>
            <AnimatePresence>
              {open === c.key ? (
                <motion.div className="ach-tiers" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  {c.thresholds.map((goal, i) => {
                    const got = !!p.achievements[`${c.key}-${i + 1}`];
                    return (
                      <div key={i} className={`ach-tier ${got ? 'got' : ''}`} style={{ ['--tc' as string]: tierColor(i + 1) }} title={t(c.desc, { n: goal.toLocaleString() })}>
                        <span className="at-badge">{got ? c.emoji : '🔒'}</span>
                        <span className="at-num">{roman(i + 1)}</span>
                        <span className="at-goal">{goal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

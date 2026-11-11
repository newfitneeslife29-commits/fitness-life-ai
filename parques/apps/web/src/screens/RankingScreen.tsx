import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RankRow } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { COUNTRIES } from '../lib/countries';
import { useT } from '../lib/i18n';

type Scope = 'global' | 'country' | 'friends';

export function RankingScreen() {
  const t = useT();
  const o = useOnline();
  const p = useProfile();
  const [scope, setScope] = useState<Scope>('global');
  const [rows, setRows] = useState<RankRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    o.ranking(scope).then((r) => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const flag = (c: string) => COUNTRIES.find((x) => x.code === c)?.flag ?? '🌎';
  const country = COUNTRIES.find((c) => c.code === p.country);
  const top = rows?.slice(0, 3) ?? [];

  return (
    <div className="screen ranking-screen with-nav">
      <TopBar back title={t('Ranking')} />
      <div className="tabs wide">
        <button className={scope === 'global' ? 'on' : ''} onClick={() => setScope('global')}>🌎 Global</button>
        <button className={scope === 'country' ? 'on' : ''} onClick={() => setScope('country')}>{country?.flag} {country?.name}</button>
        <button className={scope === 'friends' ? 'on' : ''} onClick={() => setScope('friends')}>👥 {t('Amigos')}</button>
      </div>
      {loading ? (
        <motion.div className="loading-dice" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>🎲</motion.div>
      ) : rows === null ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">📡</span>
          <h3>Ranking sin conexión</h3>
          <p className="rule-note">El ranking vive en el servidor online. Inícialo con <code>npm run dev:server</code> y juega partidas online para sumar trofeos.</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">🏁</span>
          <h3>Todavía no hay nadie aquí</h3>
          <p className="rule-note">¡Juega una partida online y sé el primero!</p>
        </section>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={scope} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rank-wrap">
            <div className="rank-podium">
              {[top[1], top[0], top[2]].map((r, k) =>
                r ? (
                  <motion.div key={r.playerId} className={`rp-col p${k}`} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * k }}>
                    {k === 1 ? <span className="rp-crown">👑</span> : null}
                    <Avatar emoji={r.avatar} size={k === 1 ? 70 : 56} />
                    <b>{r.name}</b>
                    <span>🏆 {r.rating}</span>
                    <div className="rp-block">{k === 1 ? 1 : k === 0 ? 2 : 3}</div>
                  </motion.div>
                ) : (
                  <div key={k} className="rp-col empty" />
                ),
              )}
            </div>
            <div className="card glossy rank-list">
              {rows.map((r, i) => (
                <div key={r.playerId} className={`rank-row ${r.playerId === p.id ? 'me' : ''}`}>
                  <span className="rr-pos">{i + 1}</span>
                  <Avatar emoji={r.avatar} size={36} />
                  <span className="rr-name">
                    {flag(r.country)} {r.name}
                    <small>{r.wins} victorias · {r.games} partidas</small>
                  </span>
                  <span className="rr-rating">🏆 {r.rating}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      <BottomNav />
    </div>
  );
}

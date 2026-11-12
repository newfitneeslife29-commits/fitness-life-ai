import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RANK_PRIZES, type RankRewardsInfo, type RankRow } from '@parques/engine';
import { CoinIcon, GemIcon } from '../components/Counter';
import { centerOf, useFx } from '../stores/fxStore';
import { play } from '../audio/audio';
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
  const [rewards, setRewards] = useState<RankRewardsInfo | null>(null);
  const fx = useFx();

  useEffect(() => {
    void o.rankRewards().then(setRewards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimFriends = async (el: HTMLElement) => {
    const c = centerOf(el);
    const r = await p.claimFriendsPrize();
    if (!r.ok) return fx.toast({ icon: '👥', title: t(r.error ?? 'Error') });
    play('win');
    fx.fly('coin', c, 10);
    if (r.result?.gems) fx.fly('gem', c, 4);
    void o.rankRewards().then(setRewards);
  };
  const mine = rewards ? rewards[scope] : null;

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
        <button className={scope === 'country' ? 'on' : ''} onClick={() => setScope('country')}>{country?.flag} {t(country?.name ?? '')}</button>
        <button className={scope === 'friends' ? 'on' : ''} onClick={() => setScope('friends')}>👥 {t('Amigos')}</button>
      </div>
      <motion.section key={`prize-${scope}`} className="card glossy rank-prizes" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h3>🎁 {t('Premios de cada semana')}</h3>
        <div className="rp-bands">
          {RANK_PRIZES[scope].map((b, i) => (
            <span key={i} className="rp-band">
              <b>{b.upTo === 1 ? '1º' : `${(RANK_PRIZES[scope][i - 1]?.upTo ?? 0) + 1}º–${b.upTo}º`}</b>
              <span><CoinIcon size={13} /> {b.coins.toLocaleString('es-CO')}</span>
              {b.gems ? <span><GemIcon size={13} /> {b.gems}</span> : null}
            </span>
          ))}
        </div>
        {scope === 'friends' ? (
          mine && 'claimed' in mine ? (
            mine.claimed ? (
              <p className="rule-note">✓ {t('Ya reclamaste tu premio entre amigos esta semana ({n}º)', { n: mine.place })}</p>
            ) : (
              <motion.button className="btn3d green small shine" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1, repeat: Infinity }} onClick={(e) => claimFriends(e.currentTarget)}>
                🎁 {t('Reclamar premio de amigos ({n}º)', { n: mine.place })}
              </motion.button>
            )
          ) : (
            <p className="rule-note">{t('Queda en el top 3 entre al menos 3 amigos que jueguen y reclama tu premio cada semana.')}</p>
          )
        ) : mine ? (
          <p className="rule-note won">🏅 {t('La semana pasada quedaste {n}º y ganaste {c} monedas', { n: mine.place, c: mine.coins.toLocaleString('es-CO') })}</p>
        ) : (
          <p className="rule-note">{t('Los premios se entregan solos cada lunes según tus trofeos.')}</p>
        )}
      </motion.section>
      {loading ? (
        <motion.div className="loading-dice" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>🎲</motion.div>
      ) : rows === null ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">📡</span>
          <h3>{t('Ranking sin conexión')}</h3>
          <p className="rule-note">{t('El ranking vive en el servidor online. Inícialo con npm run dev:server y juega partidas online para sumar trofeos.')}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">🏁</span>
          <h3>{t('Todavía no hay nadie aquí')}</h3>
          <p className="rule-note">{t('¡Juega una partida online y sé el primero!')}</p>
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
                    <small>{t('{w} victorias · {g} partidas', { w: r.wins, g: r.games })}</small>
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

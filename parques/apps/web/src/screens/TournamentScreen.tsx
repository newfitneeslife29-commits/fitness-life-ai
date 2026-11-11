import { useT } from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { weekKey, type TournamentInfo } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { centerOf, useFx } from '../stores/fxStore';
import { play } from '../audio/audio';

function left(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

export function TournamentScreen() {
  const t = useT();
  const o = useOnline();
  const p = useProfile();
  const fx = useFx();
  const go = useApp((a) => a.go);
  const [info, setInfo] = useState<TournamentInfo | null | undefined>(undefined);
  const claimBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    o.tournament().then(setInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mine = info?.rows.findIndex((r) => r.playerId === p.id) ?? -1;
  const thisWeek = weekKey(new Date());

  const claim = async () => {
    const r = await o.claimTournament();
    if (!r?.ok) return fx.toast({ icon: '🏆', title: t(r?.error ?? 'Sin premio por reclamar') });
    p.addCurrency(r.coins ?? 0, r.gems ?? 0);
    p.setTournamentClaim(thisWeek);
    play('win');
    const c = centerOf(claimBtn.current);
    fx.fly('coin', c, 14);
    if (r.gems) fx.fly('gem', c, 6);
    fx.toast({ icon: '🏆', title: t('¡Premio del torneo! ({n}º puesto)', { n: r.place ?? 0 }), sub: `+${r.coins} 🪙 · +${r.gems} 💎` });
  };

  return (
    <div className="screen tournament-screen">
      <TopBar back title={t('Torneo semanal')} />
      <motion.div className="tour-hero" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <motion.span className="tour-cup" animate={{ rotate: [-6, 6, -6], y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          🏆
        </motion.span>
        <div>
          <h2>{t('Copa Parqués')}</h2>
          <p>{t('Cada partida online suma puntos: 1º 10 · 2º 6 · 3º 3 · 4º 1.')}</p>
          {info ? <small>{t('Termina en {time}', { time: left(info.endsAt - Date.now()) })}</small> : null}
        </div>
      </motion.div>

      {info?.prizes ? (
        <div className="prize-row">
          {info.prizes.map((pr) => (
            <div key={pr.place} className={`prize p${pr.place}`}>
              <span>{pr.place === 1 ? '🥇' : pr.place === 2 ? '🥈' : '🥉'}</span>
              <b><CoinIcon size={14} /> {pr.coins.toLocaleString('es-CO')}</b>
              <b><GemIcon size={14} /> {pr.gems}</b>
            </div>
          ))}
        </div>
      ) : null}

      <div className="tour-actions">
        <button className="btn3d green shine" onClick={() => go('online')}>⚡ {t('Jugar online')}</button>
        <button ref={claimBtn} className="btn3d purple" onClick={claim} disabled={!info}>
          🎁 {t('Premio semana pasada')}
        </button>
      </div>

      {info === undefined ? (
        <motion.div className="loading-dice" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>🎲</motion.div>
      ) : info === null ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">📡</span>
          <h3>{t('Torneo sin conexión')}</h3>
          <p className="rule-note">{t('Los torneos se juegan online. Inicia el servidor con npm run dev:server.')}</p>
        </section>
      ) : (
        <div className="card glossy rank-list">
          <h3 className="section-title">{t('Tabla de posiciones')} {mine >= 0 ? <small>· {t('vas {n}º', { n: mine + 1 })}</small> : null}</h3>
          {info.rows.length === 0 ? <p className="rule-note">{t('Nadie ha jugado esta semana. ¡Arranca tú!')}</p> : null}
          {info.rows.map((r, i) => (
            <div key={r.playerId} className={`rank-row ${r.playerId === p.id ? 'me' : ''}`}>
              <span className="rr-pos">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <Avatar emoji={r.avatar} size={36} />
              <span className="rr-name">
                {r.name}
                <small>{t('{n} partidas', { n: r.games })}</small>
              </span>
              <span className="rr-rating">⭐ {r.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

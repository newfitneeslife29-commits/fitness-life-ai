import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TOURNAMENT_TIERS, tournamentTier, type CupInfo, type HallOfFame } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { CoinIcon } from '../components/Counter';
import { useOnline } from '../lib/online';
import { useLevel, useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

function left(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

const fmt = (n: number) => n.toLocaleString('es-CO');

/** Copas semanales con inscripción (el bote se reparte al top 10) y salón de la fama. */
export function TournamentScreen() {
  const t = useT();
  const o = useOnline();
  const p = useProfile();
  const lvl = useLevel().level;
  const fx = useFx();
  const go = useApp((a) => a.go);
  const [cups, setCups] = useState<CupInfo[] | null | undefined>(undefined);
  const [tab, setTab] = useState<string>('bronce');
  const [hall, setHall] = useState<HallOfFame | null>(null);
  const [hallTab, setHallTab] = useState<'wins' | 'coins'>('wins');
  const [busy, setBusy] = useState(false);

  const load = () => void o.cups().then(setCups);
  useEffect(() => {
    load();
    void o.hallOfFame().then(setHall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cup = cups?.find((c) => c.tier === tab);
  const tier = tournamentTier(tab)!;
  const mine = cup?.rows.findIndex((r) => r.playerId === p.id) ?? -1;

  const join = async (el: HTMLElement) => {
    const ok = await fx.confirm({
      icon: tier.emoji,
      title: t('Inscribirte en la {name}', { name: t(tier.name) }),
      text: t('La inscripción cuesta {n} monedas y va al bote. Juega hasta {g} partidas esta semana; los 10 con más puntos se reparten el bote.', { n: fmt(tier.fee), g: tier.maxGames }),
      ok: t('Inscribirme'),
      cancel: t('Cancelar'),
    });
    if (!ok) return;
    setBusy(true);
    const r = await p.joinCup(tier.id);
    setBusy(false);
    if (!r.ok) return fx.toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('coin');
    fx.fly('coin', centerOf(el), 6);
    fx.toast({ icon: '🎫', title: t('¡Inscrito! Mucha suerte') });
    load();
  };

  const playCup = async () => {
    if (tier.fee === 0) return go('online');
    const err = await o.cupMatch(tier.id);
    if (err) return fx.toast({ icon: '⚠️', title: t(err) });
    go('online');
  };

  return (
    <div className="screen tournament-screen">
      <TopBar back title={t('Torneos')} />

      <div className="cup-tabs">
        {TOURNAMENT_TIERS.map((tt) => (
          <motion.button key={tt.id} className={`cup-tab ${tab === tt.id ? 'on' : ''} t-${tt.id}`} whileTap={{ scale: 0.92 }} onClick={() => setTab(tt.id)}>
            <span>{tt.emoji}</span>
            <small>{t(tt.name)}</small>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} className={`tour-hero cup-hero t-${tab}`} initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -10, opacity: 0 }}>
          <motion.span className="tour-cup" animate={{ rotate: [-6, 6, -6], y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            {tier.emoji}
          </motion.span>
          <div>
            <h2>{t(tier.name)}</h2>
            <p>
              {tier.fee === 0
                ? t('Gratis: cada partida online suma puntos (1º 10 · 2º 6 · 3º 3 · 4º 1).')
                : t('Inscripción {n} · nivel {l}+ · hasta {g} partidas por semana', { n: fmt(tier.fee), l: tier.minLevel, g: tier.maxGames })}
            </p>
            {cup ? <small>{t('Termina en {time}', { time: left(cup.endsAt - Date.now()) })}</small> : null}
          </div>
        </motion.div>
      </AnimatePresence>

      {cup ? (
        <motion.div className="pool card glossy" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="pool-total">
            <small>{t('Bote')}</small>
            <motion.b key={cup.pool} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
              <CoinIcon size={20} /> {fmt(cup.pool)}
            </motion.b>
            <small>{t('{n} inscritos', { n: cup.players })}</small>
          </div>
          <div className="pool-prizes">
            {cup.prizes.slice(0, 3).map((c, i) => (
              <span key={i} className={`prize p${i + 1}`}>
                {['🥇', '🥈', '🥉'][i]} {fmt(c)}
              </span>
            ))}
            <span className="prize">4º–10º · {fmt(cup.prizes[3] ?? 0)}</span>
          </div>
        </motion.div>
      ) : null}

      <div className="tour-actions">
        {cup && !cup.joined ? (
          <button className="btn3d green shine" disabled={busy || lvl < tier.minLevel || p.coins < tier.fee} onClick={(e) => join(e.currentTarget)}>
            🎫 {lvl < tier.minLevel ? t('Necesitas nivel {n}', { n: tier.minLevel }) : t('Inscribirme ({n})', { n: fmt(tier.fee) })}
          </button>
        ) : (
          <button className="btn3d green shine" disabled={!cup || (tier.fee > 0 && (cup?.myGames ?? 0) >= tier.maxGames)} onClick={playCup}>
            ⚡ {t('Jugar partida de torneo')} {tier.fee > 0 && cup ? `(${cup.myGames}/${tier.maxGames})` : ''}
          </button>
        )}
      </div>

      {cups === undefined ? (
        <motion.div className="loading-dice" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>🎲</motion.div>
      ) : cups === null ? (
        <section className="card glossy setup-card center">
          <span className="quick-hero">📡</span>
          <h3>{t('Sin conexión')}</h3>
        </section>
      ) : cup ? (
        <div className="card glossy rank-list">
          <h3 className="section-title">
            {t('Tabla de posiciones')} {mine >= 0 ? <small>· {t('vas {n}º', { n: mine + 1 })}</small> : null}
          </h3>
          {cup.rows.length === 0 ? <p className="rule-note">{t('Nadie ha jugado esta semana. ¡Arranca tú!')}</p> : null}
          {cup.rows.map((r, i) => (
            <motion.div key={r.playerId} className={`rank-row ${r.playerId === p.id ? 'me' : ''}`} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
              <span className="rr-pos">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <Avatar emoji={r.avatar} size={36} />
              <span className="rr-name">
                {r.name}
                <small>{t('{n} partidas', { n: r.games })}</small>
              </span>
              <span className="rr-rating">⭐ {r.points}</span>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className="card glossy rank-list hall">
        <h3 className="section-title">🏛️ {t('Salón de la fama')}</h3>
        <div className="seg">
          <button className={hallTab === 'wins' ? 'on' : ''} onClick={() => setHallTab('wins')}>
            🏆 {t('Más torneos ganados')}
          </button>
          <button className={hallTab === 'coins' ? 'on' : ''} onClick={() => setHallTab('coins')}>
            💰 {t('Más dinero ganado')}
          </button>
        </div>
        {(hall?.[hallTab] ?? []).length === 0 ? <p className="rule-note">{t('Todavía no hay campeones. ¡Sé el primero!')}</p> : null}
        {(hall?.[hallTab] ?? []).map((r, i) => (
          <div key={r.playerId} className={`rank-row ${r.playerId === p.id ? 'me' : ''}`}>
            <span className="rr-pos">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
            <Avatar emoji={r.avatar} size={36} />
            <span className="rr-name">{r.name}</span>
            <span className="rr-rating">{hallTab === 'wins' ? `🏆 ${r.value}` : `🪙 ${fmt(r.value)}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

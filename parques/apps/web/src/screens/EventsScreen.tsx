import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { CoinIcon, GemIcon } from '../components/Counter';
import { missionDef, type MissionState } from '../meta/missions';
import { activeSeason, nextSeason, seasonEnd } from '../meta/seasons';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useApp } from '../stores/appStore';
import { locale, useT } from '../lib/i18n';
import { useSettings } from '../stores/settingsStore';
import { play } from '../audio/audio';

export function EventsScreen() {
  const t = useT();
  const lang = useSettings((x) => x.language);
  const p = useProfile();
  const fx = useFx();
  const go = useApp((a) => a.go);
  const season = activeSeason();
  const next = nextSeason();

  const claim = (m: MissionState, el: HTMLElement) => {
    const r = p.claimMission(m.id);
    if (!r) return;
    play('coin');
    const c = centerOf(el);
    fx.fly('coin', c, 8);
  };

  const list = (title: string, items: MissionState[], resets: string) => (
    <section className="card glossy missions">
      <h3>
        {title} <small>{resets}</small>
      </h3>
      {items.map((m) => {
        const def = missionDef(m.id);
        const done = m.progress >= def.goal;
        return (
          <div key={m.id} className={`mission ${m.claimed ? 'claimed' : ''}`}>
            <div className="mi-body">
              <span className="mi-text">{t(def.text)}</span>
              <div className="mi-bar">
                <motion.div className="mi-fill" initial={false} animate={{ width: `${(m.progress / def.goal) * 100}%` }} />
                <span>{m.progress}/{def.goal}</span>
              </div>
            </div>
            <div className="mi-reward">
              <span><CoinIcon size={15} /> {def.coins}</span>
              {def.gems ? <span><GemIcon size={15} /> {def.gems}</span> : null}
            </div>
            {m.claimed ? (
              <span className="mi-ok">✓</span>
            ) : (
              <motion.button className="btn3d small green" disabled={!done} onClick={(e) => claim(m, e.currentTarget)} animate={done ? { scale: [1, 1.08, 1] } : undefined} transition={done ? { repeat: Infinity, duration: 1 } : undefined}>
                {t('Reclamar')}
              </motion.button>
            )}
          </div>
        );
      })}
    </section>
  );

  return (
    <div className="screen events-screen with-nav">
      <TopBar back title={t('Eventos')} />
      {season ? (
        <motion.div className="event-hero" style={{ ['--sa' as string]: season.colors[0], ['--sb' as string]: season.colors[1] }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="eh-emoji">{season.emoji}</span>
          <div>
            <h2>{t(season.name)}</h2>
            <p>{t(season.blurb)}</p>
            <small>{t('Termina el {date}', { date: new Date(seasonEnd(season)).toLocaleDateString(locale(lang), { day: 'numeric', month: 'long' }) })}</small>
          </div>
          <button className="btn3d small" onClick={() => go('shop')}>{t('Ver skins')}</button>
        </motion.div>
      ) : (
        <div className="event-hero muted">
          <span className="eh-emoji">{next.season.emoji}</span>
          <div>
            <h2>{t('Se viene')}: {t(next.season.name)}</h2>
            <p>{t(next.season.blurb)}</p>
          </div>
        </div>
      )}
      {list(t('Misiones diarias'), p.missions.daily, t('se renuevan cada día'))}
      {list(t('Misiones semanales'), p.missions.weekly, t('se renuevan cada lunes'))}
      <motion.button className="event-tour card glossy" whileTap={{ scale: 0.97 }} onClick={() => go('tournament')}>
        🏆 <b>{t('Torneo semanal')}</b> — {t('juega online, suma puntos y gana premios.')} ›
      </motion.button>
      <BottomNav />
    </div>
  );
}

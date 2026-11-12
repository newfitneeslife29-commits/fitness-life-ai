import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { CoinIcon, GemIcon } from '../components/Counter';
import { missionDef, type MissionState } from '@parques/engine';
import { activeSeason, nextSeason, seasonEnd, eventAt, item } from '@parques/engine';
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

  const ev = eventAt();
  const evDays = Math.max(0, Math.ceil((ev.endsAt - Date.now()) / 86400000));
  const maxGoal = ev.def.tiers[ev.def.tiers.length - 1]!.goal;

  const claim = async (m: MissionState, el: HTMLElement) => {
    const c = centerOf(el);
    const r = await p.claimMission(m.id);
    if (!r.ok) return fx.toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('coin');
    fx.fly('coin', c, 8);
  };

  const claimTier = async (i: number, el: HTMLElement) => {
    const c = centerOf(el);
    const r = await p.claimEvent(i);
    if (!r.ok) return fx.toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('coin');
    fx.fly('coin', c, 10);
    if (r.result?.gems) fx.fly('gem', c, 5);
    if (r.result?.itemId) fx.toast({ icon: '🎁', title: t('¡Ganaste un objeto exclusivo!'), sub: t(item(r.result.itemId).name) });
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
      <motion.section className="card glossy ev15" style={{ ['--ea' as string]: ev.def.colors[0], ['--eb' as string]: ev.def.colors[1] }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="ev15-head">
          <motion.span className="ev15-emoji" animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            {ev.def.emoji}
          </motion.span>
          <div>
            <small>{t('Evento de 15 días')}</small>
            <h2>{t(ev.def.name)}</h2>
            <p>{t(ev.def.how)}</p>
          </div>
          <span className="chip">⏳ {t('{n} días', { n: evDays })}</span>
        </div>
        <div className="ev15-bar">
          <motion.div className="ev15-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (p.event.points / maxGoal) * 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
          <span>{t('{n} puntos', { n: p.event.points })}</span>
        </div>
        <div className="ev15-tiers">
          {ev.def.tiers.map((tier, i) => {
            const reached = p.event.points >= tier.goal;
            const claimed = p.event.claimed.includes(i);
            return (
              <motion.div key={i} className={`ev15-tier ${reached ? 'on' : ''} ${claimed ? 'done' : ''} ${tier.itemId ? 'big' : ''}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 * i }}>
                <b>{tier.goal}</b>
                {tier.itemId ? <span className="ev15-item">{item(tier.itemId).emoji}</span> : null}
                <span><CoinIcon size={13} /> {tier.coins.toLocaleString()}</span>
                {tier.gems ? <span><GemIcon size={13} /> {tier.gems}</span> : null}
                {claimed ? (
                  <span className="mi-ok">✓</span>
                ) : (
                  <motion.button className="btn3d small green" disabled={!reached} onClick={(e) => claimTier(i, e.currentTarget)} animate={reached ? { scale: [1, 1.08, 1] } : undefined} transition={reached ? { repeat: Infinity, duration: 1 } : undefined}>
                    {t('Reclamar')}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>
      {list(t('Misiones diarias'), p.missions.daily, t('se renuevan cada día'))}
      {list(t('Misiones semanales'), p.missions.weekly, t('se renuevan cada lunes'))}
      <motion.button className="event-tour card glossy" whileTap={{ scale: 0.97 }} onClick={() => go('tournament')}>
        🏆 <b>{t('Torneos')}</b> — {t('inscríbete, suma puntos y llévate el bote.')} ›
      </motion.button>
      <BottomNav />
    </div>
  );
}

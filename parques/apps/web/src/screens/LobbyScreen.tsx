import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { DailyReward } from '../components/DailyReward';
import { useApp } from '../stores/appStore';
import { useProfile } from '../stores/profileStore';
import { activeSeason, nextSeason, seasonEnd } from '@parques/engine';
import { dailyStatus, dayKey } from '@parques/engine';
import { missionDef } from '@parques/engine';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { BoardMini } from '../game/Board';
import { Mascot } from '../components/Mascot';
import { item } from '@parques/engine';
import { passSeasonId, tierFromXp, eventAt, AD_MAX_BALANCE } from '@parques/engine';
import { watchAdForCoins } from '../lib/ads';
import { providers, signIn } from '../lib/auth';

function countdown(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export function LobbyScreen() {
  const { go, openSetup, dailyOpen, setDailyOpen } = useApp();
  const p = useProfile();
  const t = useT();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const season = activeSeason();
  const upcoming = season ? null : nextSeason();
  const daily = dailyStatus(p.daily.lastClaim, p.daily.streak, dayKey());
  const giftReady = daily.canClaim || p.daily.lastSpin !== dayKey();
  const passTier = tierFromXp(p.pass.season === passSeasonId() ? p.pass.xp : 0);
  const passReady = Array.from({ length: passTier }, (_, i) => i + 1).filter((tier) => !p.pass.claimedFree.includes(tier) || (p.pass.premium && !p.pass.claimedPremium.includes(tier))).length;
  const missionsReady = [...p.missions.daily, ...p.missions.weekly].filter((m) => !m.claimed && m.progress >= missionDef(m.id).goal).length;
  const ev = eventAt();
  const evReady = ev.def.tiers.filter((tr, i) => p.event.points >= tr.goal && !p.event.claimed.includes(i)).length;
  const lowCoins = p.coins < AD_MAX_BALANCE;

  let tileN = 0;
  const tile = (icon: string, title: string, sub: string, cls: string, onClick: () => void, badge?: string) => (
    <motion.button
      className={`mode-tile ${cls}`}
      initial={{ y: 24, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.12 + tileN++ * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -3 }}
      onClick={() => { play('tap'); onClick(); }}
    >
      <motion.span className="mt-icon" whileHover={{ rotate: [0, -12, 12, 0], scale: 1.15 }} transition={{ duration: 0.45 }}>
        {icon}
      </motion.span>
      <span className="mt-title">{t(title)}</span>
      <span className="mt-sub">{t(sub)}</span>
      {badge ? <span className="mt-badge">{badge}</span> : null}
    </motion.button>
  );

  return (
    <div className="screen lobby-screen with-nav">
      <TopBar />

      {season ? (
        <motion.button className="season-banner" style={{ ['--sa' as string]: season.colors[0], ['--sb' as string]: season.colors[1] }} whileTap={{ scale: 0.97 }} onClick={() => go('shop')}>
          <span className="sb-emoji">{season.emoji}</span>
          <span className="sb-text">
            <b>{t('Temporada')}: {t(season.name)}</b>
            <small>{t('Skins exclusivas · termina en {time}', { time: countdown(seasonEnd(season) - Date.now()) })}</small>
          </span>
          <span className="sb-go">{t('Ver')} ›</span>
        </motion.button>
      ) : upcoming ? (
        <div className="season-banner muted">
          <span className="sb-emoji">{upcoming.season.emoji}</span>
          <span className="sb-text">
            <b>{t('Próxima temporada')}: {t(upcoming.season.name)}</b>
            <small>{t('Empieza en {time}', { time: countdown(upcoming.startsAt - Date.now()) })}</small>
          </span>
        </div>
      ) : null}

      <motion.button
        className="event-banner"
        style={{ ['--ea' as string]: ev.def.colors[0], ['--eb' as string]: ev.def.colors[1] }}
        whileTap={{ scale: 0.97 }}
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={() => go('events')}
      >
        <motion.span className="sb-emoji" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}>
          {ev.def.emoji}
        </motion.span>
        <span className="sb-text">
          <b>{t('Evento')}: {t(ev.def.name)}</b>
          <small>{t('{p} puntos · termina en {time}', { p: p.event.points, time: countdown(ev.endsAt - Date.now()) })}</small>
        </span>
        {evReady ? <span className="side-dot static">{evReady}</span> : <span className="sb-go">›</span>}
      </motion.button>

      {providers().length && !p.linked.length ? (
        <div className="save-progress card glossy">
          <span>💾 {t('Guarda tu progreso')}</span>
          {providers().map((pv) => (
            <button key={pv} className={`signin-btn small ${pv}`} onClick={() => void signIn(pv)}>
              <span className="si-logo">{pv === 'apple' ? '' : 'G'}</span> {pv === 'apple' ? 'Apple' : 'Google'}
            </button>
          ))}
        </div>
      ) : null}

      {lowCoins ? (
        <motion.button className="free-coins" whileTap={{ scale: 0.95 }} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.3, repeat: Infinity }} onClick={() => { play('tap'); void watchAdForCoins(); }}>
          📺 {t('¿Sin monedas? Mira un anuncio y gana {n}', { n: 300 })}
        </motion.button>
      ) : null}

      <div className="lobby-hero">
        <div className="hero-side">
          <motion.button className="side-btn" whileTap={{ scale: 0.88 }} onClick={() => { play('tap'); setDailyOpen(true); }} animate={giftReady ? { rotate: [0, -8, 8, -4, 0] } : undefined} transition={giftReady ? { duration: 1, repeat: Infinity, repeatDelay: 1.5 } : undefined}>
            🎁
            {giftReady ? <span className="side-dot" /> : null}
            <small>{t('Recompensa diaria')}</small>
          </motion.button>
          <motion.button className="side-btn" whileTap={{ scale: 0.88 }} onClick={() => go('events')}>
            🎯
            {missionsReady ? <span className="side-dot">{missionsReady}</span> : null}
            <small>{t('Misiones')}</small>
          </motion.button>
        </div>
        <div className="hero-3d">
          <div className="hero-halo" />
          <div className="hero-3d-inner">
            <BoardMini theme={item(p.equipped.board).board!} id="lobby" className="spin" />
          </div>
          <Mascot size={78} className="lobby-mascot" />
        </div>
        <div className="hero-side">
          <motion.button className="side-btn" whileTap={{ scale: 0.88 }} onClick={() => go('tournament')}>
            🏆
            <small>{t('Torneos')}</small>
          </motion.button>
          <motion.button className="side-btn" whileTap={{ scale: 0.88 }} onClick={() => go('friends')}>
            🫂
            <small>{t('Amigos')}</small>
          </motion.button>
          <motion.button className="side-btn pass" whileTap={{ scale: 0.88 }} onClick={() => go('pass')}>
            🎟️
            {passReady ? <span className="side-dot">{passReady}</span> : null}
            <small>{t('Pase')}</small>
          </motion.button>
        </div>
      </div>

      <motion.button className="btn3d play-btn mega shine" whileTap={{ scale: 0.93 }} animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity }} onClick={() => { play('tap'); go('tables'); }}>
        ▶ {t('JUGAR')}
        <small>{t('contra la máquina')}</small>
      </motion.button>

      <div className="mode-grid3">
        {tile('🌐', 'Partida rápida', 'online', 'm-online', () => go('online'))}
        {tile('🔐', 'Mesa privada', 'con amigos', 'm-private', () => go('online'))}
        {tile('👨‍👩‍👧', 'Local', 'en el mismo celular', 'm-local', () => openSetup('local'))}
        {tile('🤝', 'Parejas', '2 vs 2', 'm-teams', () => openSetup('teams'))}
        {tile('⚡', 'Rápido', '2 fichas · 5 min', 'm-quick', () => openSetup('quick'))}
        {tile('🎲', 'Práctica libre', '4 o 6 jugadores', 'm-free', () => openSetup('ai'))}
      </div>

      <BottomNav badges={{ events: missionsReady }} />
      <DailyReward open={dailyOpen} onClose={() => setDailyOpen(false)} />
    </div>
  );
}

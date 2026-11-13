import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DIVISIONS, divisionOf, nextDivision } from '@parques/engine';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { CoinIcon, GemIcon } from './Counter';

const MIN_GAMES = 3;

/** Liga por divisiones: tu división según tus trofeos y el premio de la semana. */
export function LeagueCard() {
  const t = useT();
  const fx = useFx();
  const claimLeague = useProfile((p) => p.claimLeague);
  const [info, setInfo] = useState<{ rating: number; games: number; claimed: boolean } | null>(null);
  useEffect(() => {
    void useOnline.getState().league().then((r) => setInfo(r));
  }, []);
  const rating = info?.rating ?? 1000;
  const div = divisionOf(rating);
  const next = nextDivision(rating);
  const progress = next ? (rating - div.min) / (next.div.min - div.min) : 1;
  const canClaim = !!info && !info.claimed && info.games >= MIN_GAMES;

  const claim = async (el: HTMLElement) => {
    const r = await claimLeague();
    if (!r.ok) return fx.toast({ icon: '🏅', title: t(r.error ?? 'No se pudo') });
    play('levelup');
    fx.fly('coin', centerOf(el), 12);
    setInfo((i) => (i ? { ...i, claimed: true } : i));
    fx.toast({ icon: div.emoji, title: t('¡Premio de la liga {d}!', { d: t(div.name) }), sub: `+${div.coins.toLocaleString()} · +${div.gems} 💎` });
  };

  return (
    <motion.section className="card glossy league-card" style={{ ['--dc' as string]: div.color }} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <div className="lg-top">
        <motion.span className="lg-emblem" animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
          {div.emoji}
        </motion.span>
        <div className="lg-info">
          <small>{t('Tu liga')}</small>
          <b>{t(div.name)}</b>
          <span>🏆 {rating.toLocaleString()} {t('trofeos')}</span>
        </div>
        <div className="lg-prize">
          <span>
            <CoinIcon size={13} /> {div.coins.toLocaleString()}
          </span>
          <span>
            <GemIcon size={13} /> {div.gems}
          </span>
          <small>{t('cada semana')}</small>
        </div>
      </div>
      <div className="lg-bar">
        <motion.span className="lg-fill" initial={{ width: 0 }} animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 1 }} />
      </div>
      <div className="lg-divs">
        {DIVISIONS.map((d) => (
          <span key={d.id} className={d.id === div.id ? 'on' : rating >= d.min ? 'past' : ''} title={d.name}>
            {d.emoji}
          </span>
        ))}
      </div>
      <p className="rule-note">{next ? t('Te faltan {n} trofeos para {d}. Ganar online suma trofeos; perder resta.', { n: next.missing, d: t(next.div.name) }) : t('¡Estás en la liga más alta!')}</p>
      {info?.claimed ? (
        <p className="rule-note strong">✅ {t('Ya cobraste la liga de esta semana')}</p>
      ) : canClaim ? (
        <motion.button className="btn3d green wide shine" whileTap={{ scale: 0.94 }} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.2, repeat: Infinity }} onClick={(e) => void claim(e.currentTarget)}>
          🎁 {t('Cobrar premio de la liga')}
        </motion.button>
      ) : (
        <p className="rule-note">{t('Juega {n} partidas online esta semana para cobrar ({g}/{n})', { n: MIN_GAMES, g: info?.games ?? 0 })}</p>
      )}
    </motion.section>
  );
}

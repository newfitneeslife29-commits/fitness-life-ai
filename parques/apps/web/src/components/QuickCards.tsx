import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dailyChallenge, dayKey, isVip, STORY, vipDaysLeft, winsForChest } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { useFx } from '../stores/fxStore';
import { useOnline } from '../lib/online';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { CoinIcon, GemIcon } from './Counter';

/** Fila del inicio: cofre por victorias, reto del día, modo Historia y Pase VIP. */
export function QuickCards() {
  const t = useT();
  const p = useProfile();
  const go = useApp((a) => a.go);
  const fx = useFx();
  const [opening, setOpening] = useState<{ coins: number; gems: number } | null>(null);
  const now = Date.now();
  const vip = isVip(p.vipUntil, now);
  const need = winsForChest(vip);
  const ch = dailyChallenge(dayKey());
  const chDone = p.challenge.day === dayKey() && p.challenge.done;
  const stage = STORY[p.story];

  const openChest = async (el: HTMLElement) => {
    play('tap');
    const r = await p.openWinChest();
    if (!r.ok || !r.result) return fx.toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('levelup');
    setOpening({ coins: r.result.coins, gems: r.result.gems });
    const b = el.getBoundingClientRect();
    fx.fly('coin', { x: b.left + b.width / 2, y: b.top + b.height / 2 }, 10);
  };

  const playChallenge = async () => {
    play('tap');
    if (chDone) return fx.toast({ icon: '✅', title: t('Ya ganaste el reto de hoy'), sub: t('Mañana hay uno nuevo') });
    if (p.coins < 200) return fx.toast({ icon: '🪙', title: t('Te faltan monedas') });
    const err = await useOnline.getState().playAi({ table: 'barrio', players: ch.players, challenge: true });
    if (err) fx.toast({ icon: '⚠️', title: t(err) });
  };

  return (
    <>
      <div className="quick-cards">
        <motion.button
          className={`qc qc-chest ${p.winChest.ready ? 'ready' : ''}`}
          whileTap={{ scale: 0.93 }}
          animate={p.winChest.ready ? { rotate: [0, -3, 3, 0], scale: [1, 1.04, 1] } : undefined}
          transition={p.winChest.ready ? { duration: 1, repeat: Infinity } : undefined}
          onClick={(e) => (p.winChest.ready ? void openChest(e.currentTarget) : fx.toast({ icon: '🏆', title: t('Gana {n} partidas para abrir el cofre', { n: need }) }))}
        >
          <span className="qc-icon">{p.winChest.ready ? '🎁' : '🧰'}</span>
          <b>{p.winChest.ready ? t('¡Abrir cofre!') : t('Cofre de victorias')}</b>
          <span className="qc-pips">
            {Array.from({ length: need }, (_, i) => (
              <i key={i} className={i < p.winChest.wins || p.winChest.ready ? 'on' : ''} />
            ))}
          </span>
          {p.winChest.ready > 1 ? <span className="qc-badge">×{p.winChest.ready}</span> : null}
        </motion.button>

        <motion.button className={`qc qc-challenge ${chDone ? 'done' : ''}`} whileTap={{ scale: 0.93 }} onClick={() => void playChallenge()}>
          <span className="qc-icon">{ch.emoji}</span>
          <b>{t('Reto del día')}</b>
          <small>{chDone ? `✅ ${t('Completado')}` : t(ch.name)}</small>
          {!chDone ? (
            <span className="qc-prize">
              <CoinIcon size={12} /> {ch.coins} · <GemIcon size={12} /> {ch.gems}
            </span>
          ) : null}
        </motion.button>

        <motion.button className="qc qc-story" whileTap={{ scale: 0.93 }} onClick={() => { play('tap'); go('story'); }}>
          <span className="qc-icon">{stage ? stage.emoji : '🏆'}</span>
          <b>{t('Historia')}</b>
          <small>{stage ? t(stage.region) : t('¡Completada!')}</small>
          <span className="qc-prize">
            {Math.min(p.story, STORY.length)}/{STORY.length}
          </span>
        </motion.button>

        <motion.button className={`qc qc-vip ${vip ? 'on' : ''}`} whileTap={{ scale: 0.93 }} onClick={() => { play('tap'); go('vip'); }}>
          <span className="qc-icon">💎</span>
          <b>VIP</b>
          <small>{vip ? t('{n} días', { n: vipDaysLeft(p.vipUntil, now) }) : t('Doble premio diario')}</small>
        </motion.button>
      </div>

      <AnimatePresence>
        {opening ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpening(null)}>
            <motion.div className="modal card glossy chest-reveal" initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
              <motion.div className="reveal-rays" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
              <motion.div className="reveal-icon" initial={{ y: -40, scale: 0.4 }} animate={{ y: 0, scale: [0.4, 1.3, 1] }} transition={{ duration: 0.7 }}>
                🎁
              </motion.div>
              <h2>{t('¡Cofre de victorias!')}</h2>
              <p className="reveal-prize">
                <CoinIcon size={22} /> {opening.coins.toLocaleString()} · <GemIcon size={22} /> {opening.gems}
              </p>
              <button className="btn3d green wide" onClick={() => setOpening(null)}>
                {t('¡Bacano!')}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

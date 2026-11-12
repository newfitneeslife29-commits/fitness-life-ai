import { useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Modal } from './Modal';
import { CoinIcon } from './Counter';
import { useT } from '../lib/i18n';
import { DAILY_REWARDS, ROULETTE, dailyStatus, dayKey } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { play } from '../audio/audio';

/** Recompensa diaria (racha de 7 días) + ruleta de premios. */
export function DailyReward({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProfile();
  const fx = useFx();
  const today = dayKey();
  const st = dailyStatus(p.daily.lastClaim, p.daily.streak, today);
  const t = useT();
  const canSpin = p.daily.lastSpin !== today;
  const [tab, setTab] = useState<'streak' | 'wheel'>('streak');
  const btn = useRef<HTMLButtonElement>(null);

  const claim = async () => {
    const res = await p.claimDaily();
    if (!res.ok || !res.result) return fx.toast({ icon: '⚠️', title: t(res.error ?? 'Error') });
    const r = res.result;
    play('coin');
    const from = centerOf(btn.current);
    fx.fly('coin', from, 10);
    fx.toast({ icon: '🎁', title: t('¡Día {n} reclamado!', { n: r.day }), sub: t('+{n} monedas', { n: r.coins }) });
  };

  return (
    <Modal open={open} onClose={onClose} className="daily-modal">
      <div className="tabs">
        <button className={tab === 'streak' ? 'on' : ''} onClick={() => setTab('streak')}>
          🎁 {t('Racha diaria')}
        </button>
        <button className={tab === 'wheel' ? 'on' : ''} onClick={() => setTab('wheel')}>
          🎡 {t('Ruleta')} {canSpin ? <span className="dot" /> : null}
        </button>
      </div>
      {tab === 'streak' ? (
        <>
          <h2 className="modal-title">{t('¡Entra todos los días!')}</h2>
          <div className="daily-grid">
            {DAILY_REWARDS.map((r, i) => {
              const day = i + 1;
              const done = st.canClaim ? day < st.day : day <= st.day;
              const current = st.canClaim && day === st.day;
              return (
                <motion.div
                  key={day}
                  className={`daily-day ${done ? 'done' : ''} ${current ? 'current' : ''} ${day === 7 ? 'big' : ''}`}
                  animate={current ? { y: [0, -5, 0] } : undefined}
                  transition={current ? { duration: 1.2, repeat: Infinity } : undefined}
                >
                  <span className="dd-label">{t('Día {n}', { n: day })}</span>
                  <span className="dd-icon">{day === 7 ? '🎁' : <CoinIcon size={30} />}</span>
                  <span className="dd-val">{r.coins}</span>
                  {done ? <span className="dd-check">✓</span> : null}
                </motion.div>
              );
            })}
          </div>
          <motion.button ref={btn} className="btn3d green wide shine" whileTap={{ scale: 0.92 }} onClick={claim} disabled={!st.canClaim}>
            {st.canClaim ? t('Reclamar día {n}', { n: st.day }) : t('Vuelve mañana 😉')}
          </motion.button>
        </>
      ) : (
        <Roulette canSpin={canSpin} />
      )}
    </Modal>
  );
}

function Roulette({ canSpin }: { canSpin: boolean }) {
  const p = useProfile();
  const fx = useFx();
  const controls = useAnimationControls();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const angle = useRef(0);
  const n = ROULETTE.length;
  const t = useT();
  const seg = 360 / n;
  const wheelRef = useRef<HTMLDivElement>(null);

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    const res = await p.spin();
    if (!res.ok || !res.result) {
      setSpinning(false);
      return fx.toast({ icon: '⚠️', title: t(res.error ?? 'Error') });
    }
    const r = res.result;
    setResult(null);
    // La flecha está arriba: el sector `index` debe terminar en 0°.
    const target = 360 * 6 + (360 - (r.index * seg + seg / 2));
    const final = angle.current - (angle.current % 360) + target;
    const ticks = setInterval(() => play('spin'), 120);
    await controls.start({ rotate: final, transition: { duration: 3.6, ease: [0.15, 0.8, 0.2, 1] } });
    clearInterval(ticks);
    angle.current = final;
    setSpinning(false);
    const prize = ROULETTE[r.index]!;
    setResult(prize.label);
    play('coin');
    fx.fly('coin', centerOf(wheelRef.current), 10);
    fx.toast({ icon: '🎡', title: t('¡Premio de la ruleta!'), sub: t('+{n} monedas', { n: r.coins }) });
  };

  return (
    <div className="roulette">
      <h2 className="modal-title">{t('Ruleta de la suerte')}</h2>
      <div className="wheel-wrap" ref={wheelRef}>
        <div className="wheel-arrow">▼</div>
        <motion.div className="wheel" animate={controls} initial={{ rotate: 0 }}>
          <svg viewBox="-100 -100 200 200">
            {ROULETTE.map((s, i) => {
              const a0 = ((i * seg - 90) * Math.PI) / 180;
              const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
              const mid = (((i + 0.5) * seg - 90) * Math.PI) / 180;
              return (
                <g key={i}>
                  <path d={`M0 0 L${Math.cos(a0) * 95} ${Math.sin(a0) * 95} A95 95 0 0 1 ${Math.cos(a1) * 95} ${Math.sin(a1) * 95} Z`} fill={s.color} stroke="#fff" strokeWidth={2} />
                  <text
                    x={Math.cos(mid) * 62}
                    y={Math.sin(mid) * 62}
                    transform={`rotate(${(i + 0.5) * seg} ${Math.cos(mid) * 62} ${Math.sin(mid) * 62})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight={900}
                    fill="#fff"
                    stroke="rgba(0,0,0,.35)"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    fontFamily="Nunito"
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
            <circle r={18} fill="#2a1660" stroke="#ffcf3f" strokeWidth={4} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={16}>🎲</text>
          </svg>
        </motion.div>
      </div>
      {result ? <div className="roulette-result">{t('¡Ganaste {n} monedas!', { n: result })}</div> : null}
      <motion.button className="btn3d purple wide shine" whileTap={{ scale: 0.92 }} onClick={spin} disabled={!canSpin || spinning}>
        {spinning ? t('Girando…') : canSpin ? t('¡Girar gratis!') : t('Mañana tienes otro giro')}
      </motion.button>
    </div>
  );
}

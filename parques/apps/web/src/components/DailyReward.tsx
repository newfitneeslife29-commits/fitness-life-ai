import { useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Modal } from './Modal';
import { CoinIcon, GemIcon } from './Counter';
import { DAILY_REWARDS, ROULETTE, dailyStatus, dayKey } from '../meta/economy';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { play } from '../audio/audio';

/** Recompensa diaria (racha de 7 días) + ruleta de premios. */
export function DailyReward({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProfile();
  const fx = useFx();
  const today = dayKey();
  const st = dailyStatus(p.daily.lastClaim, p.daily.streak, today);
  const canSpin = p.daily.lastSpin !== today;
  const [tab, setTab] = useState<'streak' | 'wheel'>('streak');
  const btn = useRef<HTMLButtonElement>(null);

  const claim = () => {
    const r = p.claimDaily();
    if (!r) return;
    play('coin');
    const from = centerOf(btn.current);
    fx.fly('coin', from, 10);
    if (r.gems) fx.fly('gem', from, 4);
    fx.toast({ icon: '🎁', title: `¡Día ${r.day} reclamado!`, sub: `+${r.coins} monedas${r.gems ? ` · +${r.gems} gemas` : ''}` });
  };

  return (
    <Modal open={open} onClose={onClose} className="daily-modal">
      <div className="tabs">
        <button className={tab === 'streak' ? 'on' : ''} onClick={() => setTab('streak')}>
          🎁 Racha diaria
        </button>
        <button className={tab === 'wheel' ? 'on' : ''} onClick={() => setTab('wheel')}>
          🎡 Ruleta {canSpin ? <span className="dot" /> : null}
        </button>
      </div>
      {tab === 'streak' ? (
        <>
          <h2 className="modal-title">¡Entra todos los días!</h2>
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
                  <span className="dd-label">Día {day}</span>
                  <span className="dd-icon">{day === 7 ? '🎁' : r.gems ? <GemIcon size={30} /> : <CoinIcon size={30} />}</span>
                  <span className="dd-val">{r.coins}{r.gems ? ` +${r.gems}💎` : ''}</span>
                  {done ? <span className="dd-check">✓</span> : null}
                </motion.div>
              );
            })}
          </div>
          <motion.button ref={btn} className="btn3d green wide shine" whileTap={{ scale: 0.92 }} onClick={claim} disabled={!st.canClaim}>
            {st.canClaim ? `Reclamar día ${st.day}` : 'Vuelve mañana 😉'}
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
  const seg = 360 / n;
  const wheelRef = useRef<HTMLDivElement>(null);

  const spin = async () => {
    if (spinning) return;
    const r = p.spin();
    if (!r) return;
    setSpinning(true);
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
    p.addCurrency(r.coins, r.gems);
    play('coin');
    const from = centerOf(wheelRef.current);
    if (r.coins) fx.fly('coin', from, 10);
    if (r.gems) fx.fly('gem', from, 6);
    fx.toast({ icon: '🎡', title: '¡Premio de la ruleta!', sub: r.coins ? `+${r.coins} monedas` : `+${r.gems} gemas` });
  };

  return (
    <div className="roulette">
      <h2 className="modal-title">Ruleta de la suerte</h2>
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
      {result ? <div className="roulette-result">¡Ganaste {result}!</div> : null}
      <motion.button className="btn3d purple wide shine" whileTap={{ scale: 0.92 }} onClick={spin} disabled={!canSpin || spinning}>
        {spinning ? 'Girando…' : canSpin ? '¡Girar gratis!' : 'Mañana tienes otro giro'}
      </motion.button>
    </div>
  );
}

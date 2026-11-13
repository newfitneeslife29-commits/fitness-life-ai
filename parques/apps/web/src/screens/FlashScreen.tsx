import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FLASH } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

/** Torneo relámpago: 16 jugadores, 4 mesas y la final con los 4 ganadores. */
export function FlashScreen() {
  const t = useT();
  const fx = useFx();
  const coins = useProfile((p) => p.coins);
  const flash = useOnline((o) => o.flash);
  const join = useOnline((o) => o.flashJoin);
  const cancel = useOnline((o) => o.flashCancel);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const b = flash?.bracket;
  const queued = !!flash && !b;

  const start = async () => {
    play('tap');
    if (coins < FLASH.entry) return fx.toast({ icon: '🪙', title: t('Te faltan monedas') });
    const err = await join();
    if (err) fx.toast({ icon: '⚠️', title: t(err) });
  };

  const status = !b
    ? null
    : b.me === 'champion'
      ? `🏆 ${t('¡Campeón del torneo relámpago!')}`
      : b.me === 'final'
        ? `⚡ ${t('¡Estás en la final!')}`
        : b.me === 'waiting'
          ? `⏳ ${t('Ganaste tu mesa: esperando a las demás para la final')}`
          : b.me === 'out'
            ? `😅 ${t('Quedaste por fuera esta vez')}`
            : b.me === 'done'
              ? `🏁 ${t('Torneo terminado')}`
              : `🎲 ${t('Jugando la semifinal')}`;

  return (
    <div className="screen flash-screen">
      <TopBar back title={t('Torneo relámpago')} />
      <motion.section className="card glossy flash-hero" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <motion.div className="flash-bolt" animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
          ⚡
        </motion.div>
        <h2>{t('16 jugadores · 4 mesas · 1 final')}</h2>
        <p className="rule-note">{t('Gana tu mesa para llegar a la final. Si no se llenan los cupos en 30 s, la máquina completa.')}</p>
        <div className="flash-prizes">
          {FLASH.prizes.map((p, i) => (
            <span key={i} className={`fp fp-${i}`}>
              <b>{['🥇', '🥈', '🥉', '4º'][i]}</b>
              <span>
                <CoinIcon size={12} /> {p.coins.toLocaleString()}
              </span>
              {p.gems ? (
                <span>
                  <GemIcon size={12} /> {p.gems}
                </span>
              ) : null}
            </span>
          ))}
        </div>
        {status ? <p className="flash-status">{status}</p> : null}
        {queued ? (
          <>
            <p className="flash-status">
              ⏳ {t('Buscando jugadores: {n}/16', { n: flash.waiting ?? 1 })} · {Math.max(0, Math.ceil(((flash.startsAt ?? now) - now) / 1000))} s
            </p>
            <button className="btn3d small red" onClick={cancel}>
              {t('Cancelar')}
            </button>
          </>
        ) : !b || b.stage === 'done' ? (
          <motion.button className="btn3d play-btn wide shine" whileTap={{ scale: 0.94 }} onClick={() => void start()}>
            {t('Entrar')} · <CoinIcon size={16} /> {FLASH.entry.toLocaleString()}
          </motion.button>
        ) : null}
      </motion.section>

      {b ? (
        <section className="card glossy flash-bracket">
          <div className="fb-col">
            {b.semis.map((s, i) => (
              <motion.div key={i} className={`fb-table ${s.winner ? 'done' : ''}`} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
                <small>
                  {t('Mesa')} {i + 1}
                </small>
                {s.names.map((n) => (
                  <span key={n} className={s.winner === n ? 'win' : s.winner ? 'lost' : ''}>
                    {n}
                  </span>
                ))}
              </motion.div>
            ))}
          </div>
          <div className="fb-arrow">➜</div>
          <motion.div className={`fb-final ${b.stage === 'done' ? 'done' : ''}`} animate={b.stage === 'final' ? { scale: [1, 1.04, 1] } : undefined} transition={{ duration: 1.4, repeat: Infinity }}>
            <b>🏆 {t('Final')}</b>
            {(b.final?.ranking.length ? b.final.ranking : (b.final?.names ?? b.semis.map((s) => s.winner ?? '…'))).map((n, i) => (
              <span key={`${n}-${i}`} className={b.stage === 'done' && i === 0 ? 'win' : ''}>
                {b.stage === 'done' ? `${i + 1}. ` : ''}
                {n}
              </span>
            ))}
          </motion.div>
        </section>
      ) : null}
    </div>
  );
}

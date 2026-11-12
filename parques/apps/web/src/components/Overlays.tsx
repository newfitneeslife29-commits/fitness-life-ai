import { AnimatePresence, motion } from 'framer-motion';
import { useFx } from '../stores/fxStore';
import { CoinIcon, GemIcon } from './Counter';
import { useOnline } from '../lib/online';
import { useApp } from '../stores/appStore';
import { tr } from '../lib/i18n';
import { play } from '../audio/audio';

/** Invitación de un amigo a su mesa privada. */
function InviteCard() {
  const invite = useOnline((o) => o.invite);
  const dismiss = useOnline((o) => o.dismissInvite);
  return (
    <AnimatePresence>
      {invite ? (
        <motion.div className="invite-card card glossy" initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -120, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <span className="invite-av">{invite.from.avatar}</span>
          <span className="invite-text">
            <b>{invite.from.name}</b>
            <small>{tr('te invita a su mesa')}</small>
          </span>
          <button
            className="btn3d green small"
            onClick={async () => {
              play('tap');
              const code = invite.code;
              dismiss();
              const err = await useOnline.getState().joinPrivate(code);
              if (err) useFx.getState().toast({ icon: '⚠️', title: tr(err) });
              else useApp.getState().go('online');
            }}
          >
            {tr('Unirme')}
          </button>
          <button className="btn3d ghost small" onClick={dismiss}>
            ✕
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Capa global: monedas/gemas que vuelan al contador y avisos. */
export function Overlays() {
  const { flyers, toasts, ask } = useFx();
  return (
    <>
      <InviteCard />
      <AnimatePresence>
        {ask ? (
          <motion.div className="modal-backdrop ask-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal card glossy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}>
              <div className="ask-icon">{ask.icon}</div>
              <h2 className="modal-title">{ask.title}</h2>
              <p className="modal-text">{ask.text}</p>
              <button className="btn3d green wide" onClick={() => ask.resolve(true)}>
                {ask.ok}
              </button>
              <button className="btn3d ghost wide" onClick={() => ask.resolve(false)}>
                {ask.cancel}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="fly-layer" aria-hidden>
        {flyers.map((f) => {
          const mid = { x: (f.from.x + f.to.x) / 2 + (Math.random() - 0.5) * 120, y: Math.min(f.from.y, f.to.y) - 80 };
          return (
            <motion.div
              key={f.id}
              className="flyer"
              initial={{ x: f.from.x, y: f.from.y, scale: 0.4, opacity: 0 }}
              animate={{ x: [f.from.x, mid.x, f.to.x], y: [f.from.y, mid.y, f.to.y], scale: [0.4, 1.3, 0.7], opacity: [0, 1, 1] }}
              transition={{ duration: 0.9, delay: f.delay, ease: 'easeInOut' }}
            >
              {f.kind === 'coin' ? <CoinIcon size={26} /> : f.kind === 'gem' ? <GemIcon size={26} /> : <span className="xp-flyer">XP</span>}
            </motion.div>
          );
        })}
      </div>
      <div className="toast-layer">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" initial={{ y: -40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }} layout>
              <span className="toast-icon">{t.icon}</span>
              <div>
                <div className="toast-title">{t.title}</div>
                {t.sub ? <div className="toast-sub">{t.sub}</div> : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

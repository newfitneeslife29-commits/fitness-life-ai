import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QUICK_MESSAGES } from '@parques/engine';
import type { DirectMessage, Friend } from '@parques/engine';
import { Avatar } from './Avatar';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

/** Chat con un amigo: mensajes rápidos o escritos (filtrados por el servidor). */
export function DmSheet({ friend, online, onClose, onChallenge }: { friend: Friend; online: boolean; onClose: () => void; onChallenge: () => void }) {
  const block = useProfile((p) => p.block);
  const t = useT();
  const me = useProfile((p) => p.id);
  const fx = useFx();
  const call = useOnline((o) => o.call);
  const msgs = useOnline((o) => o.dms[friend.id] ?? []);
  const markRead = useOnline((o) => o.markRead);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void call<DirectMessage[]>('dm_history', friend.id).then((h) => {
      if (h) useOnline.setState((st) => ({ dms: { ...st.dms, [friend.id]: h } }));
    });
    markRead(friend.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
    markRead(friend.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length]);

  const send = async (raw: string) => {
    const msg = raw.trim();
    if (!msg) return;
    setText('');
    const r = await call<{ ok: boolean; error?: string; msg?: DirectMessage }>('dm', { to: friend.id, text: msg });
    if (!r?.ok || !r.msg) return fx.toast({ icon: '⚠️', title: t(r?.error ?? 'Error') });
    play('tap');
    useOnline.getState().pushDm(r.msg);
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal card glossy dm-sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="dm-head">
          <Avatar emoji={friend.avatar} size={40} />
          <span className="fr-name">
            {friend.name}
            <small className={online ? 'on' : 'off'}>{online ? `● ${t('Conectado')}` : `○ ${t('Desconectado')}`}</small>
          </span>
          <button className="btn3d small purple" disabled={!online} onClick={onChallenge}>
            ⚔️ {t('Retar')}
          </button>
          <button className="round-btn small" onClick={onClose} aria-label={t('Cerrar')}>
            ✕
          </button>
        </div>
        <div className="chat-list">
          {msgs.length === 0 ? <p className="rule-note">{t('Escríbele a tu amigo o mándale un mensaje rápido')}</p> : null}
          {msgs.map((m, i) => (
            <motion.div key={`${m.at}-${i}`} className={`chat-msg ${m.from === me ? 'mine' : ''}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <span>{m.text}</span>
              <small>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </motion.div>
          ))}
          <div ref={end} />
        </div>
        <div className="quick-msgs">
          {QUICK_MESSAGES.map((q) => (
            <button key={q} className="chip-btn" onClick={() => void send(t(q))}>
              {t(q)}
            </button>
          ))}
        </div>
        <div className="search-row">
          <input className="text-input" maxLength={200} placeholder={t('Escribe un mensaje…')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send(text)} />
          <button className="btn3d small green" onClick={() => void send(text)}>
            ➤
          </button>
        </div>
        <div className="dm-foot">
          <button
            className="link-btn"
            onClick={async () => {
              if (!confirm(t('¿Bloquear a {n}? Ya no podrá escribirte ni invitarte y saldrá de tus amigos.', { n: friend.name }))) return;
              await block(friend.id);
              fx.toast({ icon: '🚫', title: t('Jugador bloqueado') });
              onClose();
            }}
          >
            🚫 {t('Bloquear')}
          </button>
          <button
            className="link-btn"
            onClick={async () => {
              const r = await call<{ ok: boolean; error?: string }>('report', { playerId: friend.id, reason: 'groserías' });
              fx.toast({ icon: r?.ok ? '🛡️' : '⚠️', title: t(r?.ok ? 'Reporte enviado. ¡Gracias por cuidar la comunidad!' : (r?.error ?? 'Error')) });
            }}
          >
            🚩 {t('Reportar')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

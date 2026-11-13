import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { inviteUrl, REFERRAL } from '@parques/engine';
import type { Friend, PublicPlayer } from '@parques/engine';
import { DmSheet } from '../components/DmSheet';
import { CoinIcon, GemIcon } from '../components/Counter';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { useFx } from '../stores/fxStore';
import { serverUrl, useOnline } from '../lib/online';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

export function FriendsScreen() {
  const t = useT();
  const p = useProfile();
  const go = useApp((a) => a.go);
  const toast = useFx((f) => f.toast);
  const online = useOnline();
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<PublicPlayer | null | 'none'>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [chat, setChat] = useState<Friend | null>(null);
  const [refCode, setRefCode] = useState('');
  const unread = useOnline((o) => o.unread);
  const link = inviteUrl(serverUrl() || (typeof location !== 'undefined' ? location.origin : ''), p.id);
  const inviteText = t('¡Juguemos Parqués Colombia! Entra con mi enlace y te regalan {n} monedas: {url}', { n: REFERRAL.newCoins, url: link });

  const whatsapp = () => {
    play('tap');
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, '_blank');
  };
  const redeem = async () => {
    const r = await p.redeemReferral(refCode);
    if (!r.ok) return toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('coin');
    setRefCode('');
    toast({ icon: '🎉', title: t('¡Invitación canjeada!'), sub: `+${REFERRAL.newCoins}` });
  };

  // Quién está conectado (se refresca cada 20 s).
  useEffect(() => {
    let alive = true;
    const load = () => void online.friendsOnline(p.friends.map((f) => f.id)).then((ids) => alive && setOnlineIds(ids));
    load();
    const id = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.friends.length]);

  const search = async () => {
    const id = code.trim().toUpperCase();
    if (id.length < 6) return toast({ icon: '🤔', title: t('Ese código no parece válido') });
    if (id === p.id) return toast({ icon: '😅', title: t('Ese es tu propio código') });
    setSearching(true);
    const r = await online.findPlayer(id);
    setSearching(false);
    setFound(r ?? 'none');
  };

  const add = async (pl: PublicPlayer) => {
    const r = await p.addFriend({ id: pl.id, name: pl.name, avatar: pl.avatar });
    if (!r.ok) return toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    play('coin');
    toast({ icon: '🤝', title: t('¡Amigo agregado!'), sub: t('Podrás invitarlo a tus mesas y competir en el ranking de amigos') });
    setFound(null);
    setCode('');
  };

  const invite = async (id: string) => {
    setInviting(id);
    const err = await online.inviteFriend(id);
    setInviting(null);
    if (err) return toast({ icon: '⚠️', title: t(err) });
    toast({ icon: '📨', title: t('Invitación enviada'), sub: t('Te esperamos en la mesa privada') });
    go('online');
  };

  const share = async () => {
    const text = inviteText;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ icon: '📋', title: t('Código copiado') });
      }
    } catch {
      /* cancelado */
    }
  };

  const friends = [...p.friends].sort((a, b) => Number(onlineIds.includes(b.id)) - Number(onlineIds.includes(a.id)));

  return (
    <div className="screen friends-screen with-nav">
      <TopBar back title={t('Amigos')} />
      <motion.button className="card glossy club-banner" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: 0.97 }} onClick={() => go('club')}>
        <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          🛡️
        </motion.span>
        <span>
          <b>{t('Club')}</b>
          <small>{t('Tu parche: chat, ranking y cofre semanal')}</small>
        </span>
        <span className="chev">›</span>
      </motion.button>

      <motion.section className="card glossy setup-card ref-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h3>🎁 {t('Invita amigos y gana')}</h3>
        <p className="rule-note">
          {t('Por cada amigo que entre con tu enlace:')} <CoinIcon size={13} /> {REFERRAL.coins.toLocaleString()} + <GemIcon size={13} /> {REFERRAL.gems} · {t('Invitados: {n}/{m}', { n: p.referrals, m: REFERRAL.max })}
        </p>
        <div className="friend-code">{p.id}</div>
        <div className="row-btns">
          <button className="btn3d small green" onClick={whatsapp}>
            🟢 WhatsApp
          </button>
          <button className="btn3d small blue" onClick={share}>
            📤 {t('Compartir')}
          </button>
        </div>
        {!p.referredBy ? (
          <div className="search-row">
            <input className="text-input" placeholder={t('Código de invitación')} value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} maxLength={16} />
            <button className="btn3d small purple" onClick={() => void redeem()}>
              {t('Canjear')}
            </button>
          </div>
        ) : null}
      </motion.section>

      <motion.section className="card glossy setup-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
        <h3>🔎 {t('Buscar jugador por su código')}</h3>
        <div className="search-row">
          <input className="text-input" placeholder={t('Código de tu amigo')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button className="btn3d small green" onClick={search} disabled={searching}>
            {searching ? '…' : t('Buscar')}
          </button>
        </div>
        <AnimatePresence mode="wait">
          {found === 'none' ? (
            <motion.p key="none" className="rule-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {t('No encontramos a nadie con ese código')}
            </motion.p>
          ) : found ? (
            <motion.div key={found.id} className="found-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
              <Avatar emoji={found.avatar} size={52} level={found.level} />
              <span className="fr-name">
                {found.name} {found.country === 'CO' ? '🇨🇴' : found.country}
                <small>
                  {t('Nivel {n}', { n: found.level })} · 🏆 {found.rating} · {t('{n} victorias', { n: found.wins })}
                </small>
                <small className={found.online ? 'on' : 'off'}>{found.online ? `● ${t('Conectado')}` : `○ ${t('Desconectado')}`}</small>
              </span>
              {p.friends.some((f) => f.id === found.id) ? (
                <span className="chip">{t('Ya es tu amigo')}</span>
              ) : (
                <button className="btn3d small green" onClick={() => add(found)}>
                  ➕ {t('Agregar')}
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>

      <motion.section className="card glossy setup-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <h3>
          {t('Mis amigos ({n})', { n: p.friends.length })} · <span className="on">● {onlineIds.length}</span>
        </h3>
        {p.friends.length === 0 ? <p className="rule-note">{t('Todavía no tienes amigos agregados. ¡Comparte tu código!')}</p> : null}
        {friends.map((f, i) => {
          const on = onlineIds.includes(f.id);
          return (
            <motion.div key={f.id} className="friend-row" layout initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <span className="fr-av">
                <Avatar emoji={f.avatar} size={40} />
                <span className={`presence ${on ? 'on' : ''}`} />
              </span>
              <span className="fr-name">
                {f.name}
                <small>
                  {f.id} · {on ? t('Conectado') : t('Desconectado')}
                </small>
              </span>
              <button className="round-btn small dm-btn" onClick={() => setChat(f)} aria-label={t('Mensajes')}>
                💬{unread[f.id] ? <i className="badge-dot">{unread[f.id]}</i> : null}
              </button>
              <button className="btn3d small purple" disabled={!on || inviting === f.id} onClick={() => invite(f.id)}>
                {inviting === f.id ? '…' : `🎲 ${t('Invitar')}`}
              </button>
              <button className="round-btn small" onClick={() => p.removeFriend(f.id)} aria-label="Quitar">
                ✕
              </button>
            </motion.div>
          );
        })}
      </motion.section>
      {p.blocked.length ? (
        <section className="card glossy setup-card">
          <h3>🚫 {t('Bloqueados ({n})', { n: p.blocked.length })}</h3>
          {p.blocked.map((id) => (
            <div key={id} className="friend-row">
              <span className="fr-name">{id}</span>
              <button className="btn3d small" onClick={() => void p.unblock(id)}>
                {t('Desbloquear')}
              </button>
            </div>
          ))}
        </section>
      ) : null}
      <AnimatePresence>
        {chat ? (
          <DmSheet
            friend={chat}
            online={onlineIds.includes(chat.id)}
            onClose={() => setChat(null)}
            onChallenge={() => {
              setChat(null);
              void invite(chat.id);
            }}
          />
        ) : null}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}

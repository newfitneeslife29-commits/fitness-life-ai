import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CLUB_CHEST, CLUB_COST, CLUB_EMOJIS, CLUB_MAX } from '@parques/engine';
import type { ClubInfo, ClubRow, Profile } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useOnline } from '../lib/online';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

type R = { ok: boolean; error?: string };

/** Clubes ("parches"): crear o unirse, chat, ranking interno y cofre semanal del club. */
export function ClubScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();
  const call = useOnline((o) => o.call);
  const feed = useOnline((o) => o.clubFeed);
  const [club, setClub] = useState<ClubInfo | null | undefined>(undefined);
  const [list, setList] = useState<ClubRow[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'chat' | 'members' | 'chest'>('chat');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(CLUB_EMOJIS[0]!);
  const [text, setText] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = async () => {
    const c = await call<ClubInfo | null>('club_info');
    setClub(c ?? null);
    if (!c) setList((await call<ClubRow[]>('club_list', q)) ?? []);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!club) return;
    const fresh = feed.filter((m) => !club.messages.some((x) => x.at === m.at && x.from === m.from));
    if (fresh.length) setClub({ ...club, messages: [...club.messages, ...fresh].slice(-60) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [club?.messages.length, tab]);

  const fail = (r: R | null) => {
    fx.toast({ icon: '⚠️', title: t(r?.error ?? 'Error') });
    return false;
  };
  const search = async () => setList((await call<ClubRow[]>('club_list', q)) ?? []);
  const create = async () => {
    const r = await call<R & { profile?: Profile }>('club_create', { name, emoji });
    if (!r?.ok) return fail(r);
    if (r.profile) useProfile.getState().setFromServer(r.profile);
    play('levelup');
    fx.toast({ icon: emoji, title: t('¡Club creado!'), sub: t('Comparte el código para que tus amigos se unan') });
    setCreating(false);
    void load();
  };
  const join = async (id: string) => {
    const r = await call<R>('club_join', id);
    if (!r?.ok) return fail(r);
    play('coin');
    void load();
  };
  const leave = async () => {
    if (!confirm(t('¿Seguro que quieres salir del club?'))) return;
    const r = await call<R>('club_leave');
    if (!r?.ok) return fail(r);
    void load();
  };
  const kick = async (id: string, nm: string) => {
    if (!confirm(t('¿Sacar a {n} del club?', { n: nm }))) return;
    const r = await call<R>('club_kick', id);
    if (!r?.ok) return fail(r);
    void load();
  };
  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    const r = await call<R>('club_chat', msg);
    if (!r?.ok) fail(r);
  };
  const claim = async (tier: number, el: HTMLElement) => {
    const r = await p.claimClubChest(tier);
    if (!r.ok) return fail(r);
    play('levelup');
    fx.fly('coin', centerOf(el), 10);
    setClub((c) => (c ? { ...c, claimed: [...c.claimed, tier] } : c));
  };
  const share = async () => {
    if (!club) return;
    const msg = t('¡Únete a mi club {n} en Parqués Colombia! Código: {id}', { n: club.name, id: club.id });
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else {
        await navigator.clipboard.writeText(msg);
        fx.toast({ icon: '📋', title: t('Código copiado') });
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="screen club-screen with-nav">
      <TopBar back title={t('Club')} />
      {club === undefined ? (
        <div className="loading-dots">…</div>
      ) : club ? (
        <>
          <motion.section className="card glossy club-head" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <motion.span className="club-emblem" animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              {club.emoji}
            </motion.span>
            <div className="club-meta">
              <b>{club.name}</b>
              <small>
                {t('Código')} {club.id} · 👥 {club.members}/{CLUB_MAX} · 🏆 {t('{n} victorias esta semana', { n: club.weekWins })}
              </small>
            </div>
            <button className="round-btn small" onClick={share} aria-label={t('Compartir')}>
              📤
            </button>
          </motion.section>
          <div className="tabs">
            {(['chat', 'members', 'chest'] as const).map((k) => (
              <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
                {k === 'chat' ? `💬 ${t('Chat')}` : k === 'members' ? `🏅 ${t('Ranking')}` : `🎁 ${t('Cofre')}`}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {tab === 'chat' ? (
              <motion.section key="chat" className="card glossy club-chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="chat-list">
                  {club.messages.length === 0 ? <p className="rule-note">{t('Nadie ha escrito todavía. ¡Saluda al parche!')}</p> : null}
                  {club.messages.map((m, i) => (
                    <div key={`${m.at}-${i}`} className={`chat-msg ${m.from === p.id ? 'mine' : ''}`}>
                      {m.from !== p.id ? <small>{m.name}</small> : null}
                      <span>{m.text}</span>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <div className="search-row">
                  <input className="text-input" maxLength={160} placeholder={t('Escribe al club…')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send()} />
                  <button className="btn3d small green" onClick={() => void send()}>
                    ➤
                  </button>
                </div>
              </motion.section>
            ) : tab === 'members' ? (
              <motion.section key="members" className="card glossy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="rule-note">{t('Ranking del club: victorias online de esta semana')}</p>
                {club.rows.map((m, i) => (
                  <motion.div key={m.id} className="friend-row" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <span className="club-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                    <span className="fr-av">
                      <Avatar emoji={m.avatar} size={36} level={m.level} />
                      <span className={`presence ${m.online ? 'on' : ''}`} />
                    </span>
                    <span className="fr-name">
                      {m.name} {m.role === 'owner' ? '👑' : ''}
                      <small>
                        🏆 {m.rating} · {t('{n} victorias', { n: m.weekWins })}
                      </small>
                    </span>
                    {club.owner === p.id && m.id !== p.id ? (
                      <button className="round-btn small" onClick={() => void kick(m.id, m.name)} aria-label={t('Sacar')}>
                        ✕
                      </button>
                    ) : null}
                  </motion.div>
                ))}
                <button className="btn3d small red wide" onClick={() => void leave()}>
                  🚪 {t('Salir del club')}
                </button>
              </motion.section>
            ) : (
              <motion.section key="chest" className="card glossy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="rule-note">{t('Cada victoria online de un miembro suma. Cada uno cobra su parte del cofre una vez por semana.')}</p>
                {CLUB_CHEST.map((c, i) => {
                  const ready = club.weekWins >= c.wins;
                  const done = club.claimed.includes(i);
                  return (
                    <div key={i} className={`club-chest ${ready ? 'ready' : ''} ${done ? 'done' : ''}`}>
                      <motion.span className="cc-icon" animate={ready && !done ? { rotate: [0, -6, 6, 0], scale: [1, 1.1, 1] } : undefined} transition={{ duration: 1, repeat: Infinity }}>
                        {done ? '✅' : ready ? '🎁' : '🧰'}
                      </motion.span>
                      <span className="cc-info">
                        <b>{t('{n} victorias', { n: c.wins })}</b>
                        <span className="lg-bar">
                          <span className="lg-fill" style={{ width: `${Math.min(100, (club.weekWins / c.wins) * 100)}%` }} />
                        </span>
                        <small>
                          <CoinIcon size={12} /> {c.coins.toLocaleString()} · <GemIcon size={12} /> {c.gems}
                        </small>
                      </span>
                      <button className="btn3d small green" disabled={!ready || done} onClick={(e) => void claim(i, e.currentTarget)}>
                        {done ? t('Cobrado') : t('Cobrar')}
                      </button>
                    </div>
                  );
                })}
              </motion.section>
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          <motion.section className="card glossy setup-card" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h3>🛡️ {t('Únete a un club o crea el tuyo')}</h3>
            <p className="rule-note">{t('Juega con tu parche, chatea, compite en el ranking del club y abran juntos el cofre semanal.')}</p>
            <div className="search-row">
              <input className="text-input" placeholder={t('Nombre o código del club')} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} />
              <button className="btn3d small blue" onClick={() => void search()}>
                🔎
              </button>
            </div>
            <button className="btn3d green wide" onClick={() => setCreating(true)}>
              ➕ {t('Crear club')} · <CoinIcon size={14} /> {CLUB_COST.toLocaleString()}
            </button>
          </motion.section>
          <section className="card glossy">
            <h3>{t('Clubes destacados de la semana')}</h3>
            {list.length === 0 ? <p className="rule-note">{t('Todavía no hay clubes. ¡Crea el primero!')}</p> : null}
            {list.map((c, i) => (
              <motion.div key={c.id} className="friend-row" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <span className="club-emblem small">{c.emoji}</span>
                <span className="fr-name">
                  {c.name}
                  <small>
                    👥 {c.members}/{CLUB_MAX} · 🏆 {c.weekWins}
                  </small>
                </span>
                <button className="btn3d small purple" disabled={c.members >= CLUB_MAX} onClick={() => void join(c.id)}>
                  {t('Unirme')}
                </button>
              </motion.div>
            ))}
          </section>
        </>
      )}

      <AnimatePresence>
        {creating ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreating(false)}>
            <motion.div className="modal card glossy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={(e) => e.stopPropagation()}>
              <h2>{t('Crear club')}</h2>
              <input className="text-input" maxLength={20} placeholder={t('Nombre del club')} value={name} onChange={(e) => setName(e.target.value)} />
              <div className="emoji-grid">
                {CLUB_EMOJIS.map((e) => (
                  <button key={e} className={`emoji-pick ${e === emoji ? 'on' : ''}`} onClick={() => setEmoji(e)}>
                    {e}
                  </button>
                ))}
              </div>
              <button className="btn3d green wide" onClick={() => void create()}>
                {t('Crear')} · <CoinIcon size={14} /> {CLUB_COST.toLocaleString()}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}

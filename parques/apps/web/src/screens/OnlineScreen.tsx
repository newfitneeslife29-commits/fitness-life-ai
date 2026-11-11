import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { CoinIcon } from '../components/Counter';
import { useOnline } from '../lib/online';
import { useLevel, useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useFx } from '../stores/fxStore';
import { useApp } from '../stores/appStore';
import { Segmented, Toggle } from './SettingsScreen';
import { TABLES, payouts, type TableId } from '../meta/economy';
import { TABLE_GRADS } from './TablesScreen';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

const SIDE_COLORS = ['amarillo', 'rojo', 'verde', 'azul'];

export function OnlineScreen() {
  const t = useT();
  const o = useOnline();
  const me = useProfile();
  const lvl = useLevel();
  const defaults = useSettings((s) => s.houseRules);
  const toast = useFx((f) => f.toast);
  const go = useApp((a) => a.go);
  const [tab, setTab] = useState<'quick' | 'private'>('quick');
  const [tableId, setTableId] = useState<TableId>('barrio');
  const [code, setCode] = useState('');
  const [seats, setSeats] = useState(4);
  const [soplar, setSoplar] = useState(defaults.soplar);
  const [triple, setTriple] = useState(defaults.triplePairPenalty);
  const [teams, setTeams] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    o.connect();
    const id = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const room = o.room && o.room.status === 'waiting' ? o.room : null;
  const isHost = room?.hostId === me.id;
  const tier = TABLES.find((x) => x.id === tableId)!;

  /** Antes de entrar: nivel y monedas suficientes para la entrada. */
  const canAfford = (entry: number, minLevel: number): boolean => {
    if (lvl.level < minLevel) {
      toast({ icon: '🔒', title: t('Necesitas nivel {n}', { n: minLevel }) });
      return false;
    }
    if (me.coins < entry) {
      toast({ icon: '🪙', title: t('Te faltan monedas'), sub: t('Cómpralas en la tienda o reclama la recompensa diaria') });
      go('shop');
      return false;
    }
    return true;
  };

  const status = (
    <div className={`net-status ${o.status}`}>
      <span className="net-dot" />
      {o.status === 'online' ? t('Conectado') : o.status === 'connecting' ? t('Conectando…') : o.status === 'error' ? t(o.error ?? 'Sin conexión') : t('Desconectado')}
      {o.status === 'error' ? (
        <button className="btn3d small ghost" onClick={() => o.connect()}>
          {t('Reintentar')}
        </button>
      ) : null}
    </div>
  );

  const tierPicker = (
    <div className="stake-row">
      {TABLES.map((tt) => (
        <button
          key={tt.id}
          className={`stake ${tt.id === tableId ? 'on' : ''} ${lvl.level < tt.minLevel ? 'locked' : ''}`}
          style={{ background: `linear-gradient(160deg, ${TABLE_GRADS[tt.id][0]}55, ${TABLE_GRADS[tt.id][1]}55)` }}
          onClick={() => setTableId(tt.id)}
        >
          <span>{tt.emoji}</span>
          <b>{t(tt.name)}</b>
          <small><CoinIcon size={13} /> {tt.entry.toLocaleString()}</small>
          {lvl.level < tt.minLevel ? <em>🔒 {t('Nivel')} {tt.minLevel}</em> : tt.topOnly ? <em>🔥 Top 100</em> : null}
        </button>
      ))}
    </div>
  );

  return (
    <div className="screen online-screen">
      <TopBar back title="Online" />
      {status}
      {o.status === 'error' ? <p className="rule-note">{t('Para jugar online inicia el servidor: npm run dev:server (en la carpeta parques).')}</p> : null}

      {!room ? (
        <div className="tabs wide">
          <button className={tab === 'quick' ? 'on' : ''} onClick={() => setTab('quick')}>
            ⚡ {t('Partida rápida')}
          </button>
          <button className={tab === 'private' ? 'on' : ''} onClick={() => setTab('private')}>
            🔐 {t('Mesa privada')}
          </button>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {room ? (
          <motion.section key="room" className="card glossy setup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3>{t('Mesa privada')} · {t(TABLES.find((x) => x.id === room.table)?.name ?? '')}</h3>
            <div className="room-code">
              <span>{t('Código')}</span>
              <b>{room.code}</b>
              <button
                className="btn3d small blue"
                onClick={async () => {
                  const text = t('¡Ven a jugar Parqués conmigo! Código de mesa: {code}', { code: room.code ?? '' });
                  try {
                    if (navigator.share) await navigator.share({ text });
                    else {
                      await navigator.clipboard.writeText(room.code ?? '');
                      toast({ icon: '📋', title: t('Código copiado') });
                    }
                  } catch {
                    /* cancelado */
                  }
                }}
              >
                📤 {t('Compartir')}
              </button>
            </div>
            <p className="rule-note">{t('Entrada')}: {room.entry.toLocaleString()} 🪙</p>
            <div className="room-seats">
              {room.seats.map((s, i) => (
                <motion.div key={i} className={`room-seat ${s.playerId ? 'taken' : ''}`} style={{ ['--pc' as string]: `var(--${SIDE_COLORS[s.side]})` }} layout>
                  {s.playerId ? <Avatar emoji={s.avatar} size={44} color={`var(--${SIDE_COLORS[s.side]})`} /> : <span className="rs-empty">?</span>}
                  <span>{s.playerId ? s.name : t('Esperando…')}</span>
                  {s.playerId === room.hostId ? <small>👑 {t('Anfitrión')}</small> : null}
                </motion.div>
              ))}
            </div>
            {isHost ? (
              <button
                className="btn3d green wide shine"
                onClick={async () => {
                  const err = await o.startPrivate();
                  if (err) toast({ icon: '⚠️', title: t(err) });
                }}
              >
                ▶ {t('Empezar (las sillas vacías las juega la máquina)')}
              </button>
            ) : (
              <p className="rule-note">{t('Esperando a que el anfitrión empiece…')}</p>
            )}
            <button className="btn3d small ghost" onClick={() => o.leaveRoom()}>
              {t('Salir de la mesa')}
            </button>
          </motion.section>
        ) : tab === 'quick' ? (
          <motion.section key="quick" className="card glossy setup-card center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {o.searching ? (
              <>
                <motion.div className="radar" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  🎲
                </motion.div>
                <h3>{t('Buscando rivales…')}</h3>
                <p className="rule-note">
                  {t('{n} jugador(es) en la fila · si no llegan más, la máquina completa la mesa en {s}s', { n: o.searching.waiting, s: Math.max(0, Math.ceil((o.searching.startsAt - Date.now()) / 1000)) })}
                </p>
                <button className="btn3d small ghost" onClick={o.cancelMatch}>
                  {t('Cancelar')}
                </button>
              </>
            ) : (
              <>
                <h3>{t('Elige la sala')}</h3>
                {tierPicker}
                <p className="rule-note">
                  {t('4 jugadores · el servidor tira los dados (sin trampas).')} {t('Premios')}: {payouts(tier.entry, 4).filter((x) => x > 0).map((x, i) => `${i + 1}º ${x.toLocaleString()}`).join(' · ')} · 💎5
                </p>
                <motion.button
                  className="btn3d play-btn shine"
                  whileTap={{ scale: 0.93 }}
                  disabled={o.status !== 'online'}
                  onClick={async () => {
                    if (!canAfford(tier.entry, tier.minLevel)) return;
                    play('tap');
                    await o.quickMatch(tier.id);
                    const err = useOnline.getState().error;
                    if (err && !useOnline.getState().searching) toast({ icon: '⚠️', title: t(err) });
                  }}
                >
                  ⚡ {t('Buscar partida')}
                </motion.button>
              </>
            )}
          </motion.section>
        ) : (
          <motion.section key="private" className="card glossy setup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3>{t('Unirme con código')}</h3>
            <div className="join-row">
              <input className="text-input code-input" placeholder={t('CÓDIGO')} value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button
                className="btn3d green"
                disabled={code.length < 5 || o.status !== 'online'}
                onClick={async () => {
                  const err = await o.joinPrivate(code);
                  if (err) toast({ icon: '⚠️', title: t(err) });
                  else if (useOnline.getState().room && me.coins < (useOnline.getState().room?.entry ?? 0)) {
                    toast({ icon: '🪙', title: t('Te faltan monedas') });
                    o.leaveRoom();
                  }
                }}
              >
                {t('Entrar')}
              </button>
            </div>
            <h3>{t('Crear mesa')}</h3>
            {tierPicker}
            <div className="row">
              <span>{t('Jugadores')}</span>
              <Segmented value={teams ? 4 : seats} options={[2, 3, 4].map((n) => ({ v: n, label: String(n) }))} onChange={(v) => { setSeats(v); if (v !== 4) setTeams(false); }} />
            </div>
            <Toggle label={`🤝 ${t('Parejas 2 vs 2')}`} value={teams} onChange={(v) => { setTeams(v); if (v) setSeats(4); }} />
            <Toggle label={`🌬️ ${t('Soplar')}`} value={soplar} onChange={setSoplar} />
            <Toggle label={`🚨 ${t('Tres pares a la cárcel')}`} value={triple} onChange={setTriple} />
            <button
              className="btn3d purple wide shine"
              disabled={o.status !== 'online'}
              onClick={async () => {
                if (!canAfford(tier.entry, tier.minLevel)) return;
                const err = await o.createPrivate(seats, { soplar, triplePairPenalty: triple, jailAttempts: defaults.jailAttempts, teams }, tier.id);
                if (err) toast({ icon: '⚠️', title: t(err) });
              }}
            >
              🔐 {t('Crear mesa privada')}
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useFx } from '../stores/fxStore';
import { Segmented, Toggle } from './SettingsScreen';
import { play } from '../audio/audio';

export function OnlineScreen() {
  const o = useOnline();
  const me = useProfile((p) => p.id);
  const defaults = useSettings((s) => s.houseRules);
  const toast = useFx((f) => f.toast);
  const [tab, setTab] = useState<'quick' | 'private'>('quick');
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
  const isHost = room?.hostId === me;

  const status = (
    <div className={`net-status ${o.status}`}>
      <span className="net-dot" />
      {o.status === 'online' ? 'Conectado' : o.status === 'connecting' ? 'Conectando…' : o.status === 'error' ? o.error ?? 'Sin conexión' : 'Desconectado'}
      {o.status === 'error' ? (
        <button className="btn3d small ghost" onClick={() => o.connect()}>
          Reintentar
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="screen online-screen">
      <TopBar back title="Online" />
      {status}
      {o.status === 'error' ? (
        <p className="rule-note">
          Para jugar online inicia el servidor: <code>npm run dev:server</code> (en la carpeta parques). En el celular, usa la misma dirección de la PC.
        </p>
      ) : null}

      {!room ? (
        <div className="tabs wide">
          <button className={tab === 'quick' ? 'on' : ''} onClick={() => setTab('quick')}>
            ⚡ Partida rápida
          </button>
          <button className={tab === 'private' ? 'on' : ''} onClick={() => setTab('private')}>
            🔐 Mesa privada
          </button>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {room ? (
          <motion.section key="room" className="card glossy setup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3>Mesa privada</h3>
            <div className="room-code">
              <span>Código</span>
              <b>{room.code}</b>
              <button
                className="btn3d small blue"
                onClick={async () => {
                  const text = `¡Ven a jugar Parqués conmigo! Código de mesa: ${room.code}`;
                  try {
                    if (navigator.share) await navigator.share({ text });
                    else {
                      await navigator.clipboard.writeText(room.code ?? '');
                      toast({ icon: '📋', title: 'Código copiado' });
                    }
                  } catch {
                    /* cancelado */
                  }
                }}
              >
                📤 Compartir
              </button>
            </div>
            <div className="room-seats">
              {room.seats.map((s, i) => (
                <motion.div key={i} className={`room-seat ${s.playerId ? 'taken' : ''}`} style={{ ['--pc' as string]: `var(--${['amarillo', 'rojo', 'verde', 'azul'][s.side]})` }} layout>
                  {s.playerId ? <Avatar emoji={s.avatar} size={44} color={`var(--${['amarillo', 'rojo', 'verde', 'azul'][s.side]})`} /> : <span className="rs-empty">?</span>}
                  <span>{s.playerId ? s.name : 'Esperando…'}</span>
                  {s.playerId === room.hostId ? <small>👑 Anfitrión</small> : null}
                </motion.div>
              ))}
            </div>
            {isHost ? (
              <button
                className="btn3d green wide shine"
                onClick={async () => {
                  const err = await o.startPrivate();
                  if (err) toast({ icon: '⚠️', title: err });
                }}
              >
                ▶ Empezar (las sillas vacías las juega la máquina)
              </button>
            ) : (
              <p className="rule-note">Esperando a que el anfitrión empiece…</p>
            )}
            <button className="btn3d small ghost" onClick={() => o.leaveRoom()}>
              Salir de la mesa
            </button>
          </motion.section>
        ) : tab === 'quick' ? (
          <motion.section key="quick" className="card glossy setup-card center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {o.searching ? (
              <>
                <motion.div className="radar" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  🎲
                </motion.div>
                <h3>Buscando rivales…</h3>
                <p className="rule-note">
                  {o.searching.waiting} jugador(es) en la fila · si no llegan más, la máquina completa la mesa en {Math.max(0, Math.ceil((o.searching.startsAt - Date.now()) / 1000))}s
                </p>
                <button className="btn3d small ghost" onClick={o.cancelMatch}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="quick-hero">🌎</div>
                <h3>Emparejamiento automático</h3>
                <p className="rule-note">4 jugadores · reglas clásicas · el servidor tira los dados (sin trampas). Ganas trofeos y puntos de torneo.</p>
                <motion.button className="btn3d play-btn shine" whileTap={{ scale: 0.93 }} disabled={o.status !== 'online'} onClick={() => { play('tap'); o.quickMatch(); }}>
                  ⚡ Buscar partida
                </motion.button>
              </>
            )}
          </motion.section>
        ) : (
          <motion.section key="private" className="card glossy setup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3>Unirme con código</h3>
            <div className="join-row">
              <input className="text-input code-input" placeholder="CÓDIGO" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button
                className="btn3d green"
                disabled={code.length < 5 || o.status !== 'online'}
                onClick={async () => {
                  const err = await o.joinPrivate(code);
                  if (err) toast({ icon: '⚠️', title: err });
                }}
              >
                Entrar
              </button>
            </div>
            <h3>Crear mesa</h3>
            <div className="row">
              <span>Jugadores</span>
              <Segmented value={teams ? 4 : seats} options={[2, 3, 4].map((n) => ({ v: n, label: String(n) }))} onChange={(v) => { setSeats(v); if (v !== 4) setTeams(false); }} />
            </div>
            <Toggle label="🤝 Parejas 2 vs 2" value={teams} onChange={(v) => { setTeams(v); if (v) setSeats(4); }} />
            <Toggle label="🌬️ Soplar" value={soplar} onChange={setSoplar} />
            <Toggle label="🚨 Tres pares a la cárcel" value={triple} onChange={setTriple} />
            <button
              className="btn3d purple wide shine"
              disabled={o.status !== 'online'}
              onClick={async () => {
                const err = await o.createPrivate(seats, { soplar, triplePairPenalty: triple, jailAttempts: defaults.jailAttempts, teams });
                if (err) toast({ icon: '⚠️', title: err });
              }}
            >
              🔐 Crear mesa privada
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

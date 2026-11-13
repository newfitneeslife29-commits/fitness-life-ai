import { providers, signIn } from '../lib/auth';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSession, logout, useOnline } from '../lib/online';
import { useFx } from '../stores/fxStore';
import { TopBar } from '../components/TopBar';
import { useSettings } from '../stores/settingsStore';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { LANGUAGES, useT } from '../lib/i18n';
import { askNotificationPermission } from '../lib/notify';
import { MUSIC_TRACKS, play } from '../audio/audio';

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="row toggle-row" onClick={() => { play('tap'); onChange(!value); }} role="switch" aria-checked={value}>
      <span>{label}</span>
      <span className={`switch ${value ? 'on' : ''}`}>
        <motion.span className="knob" layout transition={{ type: 'spring', stiffness: 600, damping: 30 }} />
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented small">
      {options.map((o) => (
        <button key={String(o.v)} className={o.v === value ? 'on' : ''} onClick={() => { play('tap'); onChange(o.v); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const s = useSettings();
  const p = useProfile();
  const go = useApp((a) => a.go);
  const t = useT();
  return (
    <div className="screen settings-screen">
      <TopBar back title={t('Ajustes')} />
      <section className="card glossy setup-card">
        <h3>🔊 {t('Audio y juego')}</h3>
        <Toggle label={`🔈 ${t('Sonido')}`} value={s.sound} onChange={(v) => s.set({ sound: v })} />
        <Toggle label={`🎵 ${t('Música')}`} value={s.music} onChange={(v) => s.set({ music: v })} />
        {s.music ? <MusicPicker /> : null}
        <Toggle label={`📳 ${t('Vibración')}`} value={s.vibration} onChange={(v) => s.set({ vibration: v })} />
        <Toggle
          label={`🔔 ${t('Notificaciones (regalo diario, racha, cofre)')}`}
          value={s.notifications}
          onChange={(v) => {
            s.set({ notifications: v });
            if (v) void askNotificationPermission();
          }}
        />
        <Toggle label={`🔷 ${t('Modo daltónico (figuras en las fichas)')}`} value={s.colorblind} onChange={(v) => s.set({ colorblind: v })} />
        <Toggle label={`🔠 ${t('Letra grande')}`} value={s.bigText} onChange={(v) => s.set({ bigText: v })} />
        <div className="row">
          <span>🌐 {t('Idioma')}</span>
          <select className="text-input slim" value={s.language} onChange={(e) => s.set({ language: e.target.value as typeof s.language })}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <span>🎨 {t('Tema')}</span>
          <Segmented value={s.theme} options={[{ v: 'dark', label: `🌙 ${t('Oscuro')}` }, { v: 'light', label: `☀️ ${t('Claro')}` }]} onChange={(v) => s.set({ theme: v })} />
        </div>
      </section>

      <section className="card glossy setup-card">
        <h3>📜 {t('Reglas de la casa')}</h3>
        <Toggle label={`🌬️ ${t('Soplar')}`} value={s.houseRules.soplar} onChange={(v) => s.setRules({ soplar: v })} />
        <Toggle label={`🚨 ${t('Tres pares a la cárcel')}`} value={s.houseRules.triplePairPenalty} onChange={(v) => s.setRules({ triplePairPenalty: v })} />
        <div className="row">
          <span>🔓 {t('Intentos para salir')}</span>
          <Segmented value={s.houseRules.jailAttempts} options={[1, 2, 3].map((n) => ({ v: n, label: String(n) }))} onChange={(v) => s.setRules({ jailAttempts: v })} />
        </div>
        <div className="row">
          <span>⏱ {t('Tiempo por turno')}</span>
          <Segmented value={s.turnSeconds} options={[10, 20, 30, 0].map((n) => ({ v: n, label: n ? `${n}s` : '∞' }))} onChange={(v) => s.set({ turnSeconds: v })} />
        </div>
        <p className="rule-note">{t('Doble 1 o doble 6 sacan todas las fichas; cualquier otro par saca 1 o 2.')}</p>
      </section>

      <section className="card glossy setup-card">
        <h3>👤 {t('Cuenta')}</h3>
        <div className="row">
          <span>{t('Código de amigo')}</span>
          <b className="code">{p.id}</b>
        </div>
        <div className="row">
          <span>{t('Servidor online')}</span>
          <input className="text-input slim" placeholder={t('(mismo servidor)')} value={s.serverUrl} onChange={(e) => s.set({ serverUrl: e.target.value })} />
        </div>
        <button className="btn3d small ghost" onClick={() => go('profile')}>
          ✏️ {t('Editar nombre, foto y país')}
        </button>
        <button
          className="btn3d small blue"
          onClick={() => {
            try {
              localStorage.removeItem('parques-tutorial-done');
            } catch {
              /* sin almacenamiento */
            }
            go('tutorial');
          }}
        >
          🎓 {t('Cómo jugar: tutorial paso a paso')}
        </button>
        <AccountRecovery />
        <LogoutButton />
      </section>
      <p className="rule-note">{t('Parqués Colombia · tu progreso se guarda en el servidor')}</p>
    </div>
  );
}

/** Cuenta guardada en el servidor: código de recuperación para entrar desde otro celular. */
function AccountRecovery() {
  const t = useT();
  const toast = useFx((f) => f.toast);
  const restore = useOnline((o) => o.restore);
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const session = getSession();
  const recovery = session ? `${session.id}-${session.token}` : '';
  const linked = useProfile((p) => p.linked);
  const provs = providers();
  return (
    <div className="recovery">
      {provs.length ? (
        <div className="signin-box">
          <p className="rule-note">{t('Inicia sesión para no perder tu progreso y jugar en otro celular con la misma cuenta.')}</p>
          {provs.map((pv) => (
            <button key={pv} className={`signin-btn ${pv}`} disabled={linked.includes(pv)} onClick={() => void signIn(pv)}>
              <span className="si-logo">{pv === 'apple' ? '' : 'G'}</span>
              {linked.includes(pv) ? t('Cuenta de {p} vinculada ✓', { p: pv === 'apple' ? 'Apple' : 'Google' }) : t('Continuar con {p}', { p: pv === 'apple' ? 'Apple' : 'Google' })}
            </button>
          ))}
        </div>
      ) : null}
      <p className="rule-note">{t('Tu progreso se guarda en el servidor. Con tu código de recuperación puedes entrar desde otro celular.')}</p>
      {show ? (
        <div className="recovery-code" onClick={() => navigator.clipboard?.writeText(recovery).then(() => toast({ icon: '📋', title: t('Código copiado') }))}>
          {recovery}
        </div>
      ) : (
        <button className="btn3d small ghost" onClick={() => setShow(true)}>
          🔑 {t('Ver mi código de recuperación')}
        </button>
      )}
      <div className="join-row">
        <input className="text-input" placeholder={t('Pega un código de recuperación')} value={code} onChange={(e) => setCode(e.target.value)} />
        <button
          className="btn3d small blue"
          disabled={code.length < 20}
          onClick={async () => {
            const i = code.trim().indexOf('-');
            const err = i > 0 ? await restore(code.trim().slice(0, i), code.trim().slice(i + 1)) : 'Cuenta no válida';
            toast(err ? { icon: '⚠️', title: t(err) } : { icon: '✅', title: t('¡Cuenta recuperada!') });
            if (!err) setCode('');
          }}
        >
          {t('Entrar')}
        </button>
      </div>
    </div>
  );
}

/** Cerrar sesión con confirmación (avisa si la cuenta no está vinculada a Apple/Google). */
function LogoutButton() {
  const t = useT();
  const linked = useProfile((p) => p.linked);
  const [ask, setAsk] = useState(false);
  return (
    <>
      <motion.button className="btn3d red wide logout-btn" whileTap={{ scale: 0.95 }} onClick={() => { play('tap'); setAsk(true); }}>
        🚪 {t('Cerrar sesión')}
      </motion.button>
      <AnimatePresence>
        {ask ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAsk(false)}>
            <motion.div
              className="modal card glossy"
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div className="modal-icon" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}>
                🚪
              </motion.div>
              <h2>{t('¿Cerrar sesión?')}</h2>
              <p className="modal-text">
                {linked.length
                  ? t('Podrás volver a entrar con tu cuenta de Apple o Google cuando quieras.')
                  : t('Tu cuenta no está vinculada a Apple ni Google. Guarda tu código de recuperación antes de salir o perderás tu progreso.')}
              </p>
              <button className="btn3d red wide" onClick={() => logout()}>
                {t('Sí, cerrar sesión')}
              </button>
              <button className="btn3d ghost wide" onClick={() => setAsk(false)}>
                {t('Cancelar')}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Elegir la canción de fondo (con animación de ecualizador en la que suena). */
export function MusicPicker() {
  const t = useT();
  const track = useSettings((x) => x.musicTrack);
  const set = useSettings((x) => x.set);
  return (
    <div className="music-picker">
      {MUSIC_TRACKS.map((m) => {
        const on = (track || 'auto') === m.id;
        return (
          <motion.button key={m.id} className={`music-chip ${on ? 'on' : ''}`} whileTap={{ scale: 0.92 }} onClick={() => { play('tap'); set({ musicTrack: m.id }); }}>
            <span className="mc-emoji">{m.emoji}</span>
            <span className="mc-name">{t(m.name)}</span>
            {on ? (
              <span className="mc-eq" aria-hidden>
                {[0, 1, 2].map((k) => (
                  <motion.i key={k} animate={{ scaleY: [0.3, 1, 0.5, 0.9, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
                ))}
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

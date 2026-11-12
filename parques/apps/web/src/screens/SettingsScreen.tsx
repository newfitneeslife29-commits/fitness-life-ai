import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSession, useOnline } from '../lib/online';
import { useFx } from '../stores/fxStore';
import { TopBar } from '../components/TopBar';
import { useSettings } from '../stores/settingsStore';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { LANGUAGES, useT } from '../lib/i18n';
import { play } from '../audio/audio';

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
        <Toggle label={`📳 ${t('Vibración')}`} value={s.vibration} onChange={(v) => s.set({ vibration: v })} />
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
        <AccountRecovery />
      </section>
      <p className="rule-note">{t('Parqués · progreso guardado en este dispositivo')}</p>
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
  return (
    <div className="recovery">
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

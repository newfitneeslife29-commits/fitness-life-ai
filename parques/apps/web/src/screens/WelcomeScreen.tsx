import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dailyStatus, dayKey } from '@parques/engine';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { AVATARS } from '../lib/avatars';
import { COUNTRIES } from '../lib/countries';
import { providers, signIn } from '../lib/auth';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

export const ONBOARDED_KEY = 'parques-onboarded';

/** ¿Ya pasó por el registro? (cuentas viejas con nombre propio cuentan como registradas). */
export function isOnboarded(): boolean {
  try {
    if (localStorage.getItem(ONBOARDED_KEY)) return true;
  } catch {
    /* sin almacenamiento */
  }
  return useProfile.getState().name !== 'Jugador';
}

function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* sin almacenamiento */
  }
}

/** Registro la primera vez: nombre, avatar, país y (opcional) cuenta de Apple / Google. */
export function WelcomeScreen() {
  const t = useT();
  const p = useProfile();
  const go = useApp((a) => a.go);
  const setDailyOpen = useApp((a) => a.setDailyOpen);
  const toast = useFx((f) => f.toast);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(p.name === 'Jugador' ? '' : p.name);
  const [avatar, setAvatar] = useState(p.avatar);
  const [country, setCountry] = useState(p.country || 'CO');
  const [saving, setSaving] = useState(false);
  const provs = providers();

  const finish = async () => {
    const clean = name.trim();
    if (clean.length < 2) return toast({ icon: '✍️', title: t('Escribe tu nombre (mínimo 2 letras)') });
    setSaving(true);
    const r = await p.setIdentity({ name: clean, avatar, country });
    setSaving(false);
    if (!r.ok) return toast({ icon: '⚠️', title: t(r.error ?? 'Error') });
    markOnboarded();
    play('win');
    const prof = useProfile.getState();
    if (dailyStatus(prof.daily.lastClaim, prof.daily.streak, dayKey()).canClaim) setDailyOpen(true);
    go('lobby');
  };

  const withProvider = async (pv: 'apple' | 'google') => {
    const ok = await signIn(pv);
    if (!ok) return;
    const prof = useProfile.getState();
    // Si entró a una cuenta que ya existía (otro celular), no hace falta registrarse otra vez.
    if (prof.name !== 'Jugador') {
      markOnboarded();
      go('lobby');
      return;
    }
    setStep(1);
  };

  return (
    <div className="screen welcome-screen">
      <div className="splash-glow" />
      <Logo size={0.8} />
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.section key="s0" className="card glossy welcome-card" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
            <h2>{t('¡Bienvenido a Parqués Colombia!')}</h2>
            <p className="rule-note">{t('Crea tu jugador para empezar. Con Apple o Google tu progreso queda guardado y puedes jugar en otro celular.')}</p>
            {provs.map((pv) => (
              <button key={pv} className={`signin-btn ${pv}`} onClick={() => void withProvider(pv)}>
                <span className="si-logo">{pv === 'apple' ? '' : 'G'}</span>
                {t('Continuar con {p}', { p: pv === 'apple' ? 'Apple' : 'Google' })}
              </button>
            ))}
            <button className="btn3d green wide" onClick={() => setStep(1)}>
              ✨ {provs.length ? t('Crear jugador sin cuenta') : t('Crear mi jugador')}
            </button>
            <small className="rule-note">{t('Siempre puedes vincular tu cuenta después en Ajustes.')}</small>
          </motion.section>
        ) : (
          <motion.section key="s1" className="card glossy welcome-card" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
            <div className="welcome-preview">
              <motion.div key={avatar} initial={{ scale: 0.6, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                <Avatar emoji={avatar} size={84} />
              </motion.div>
              <b>{name.trim() || t('Tu nombre')}</b>
              <span>{COUNTRIES.find((c) => c.code === country)?.flag}</span>
            </div>
            <label className="field-label">{t('¿Cómo te llamas?')}</label>
            <input className="text-input" value={name} maxLength={14} placeholder={t('Tu nombre o apodo')} onChange={(e) => setName(e.target.value)} />
            <label className="field-label">{t('Elige tu avatar')}</label>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <motion.button key={a} className={`wl-av ${a === avatar ? "on" : ""}`} whileTap={{ scale: 0.85 }} onClick={() => { play('tap'); setAvatar(a); }}>
                  {a}
                </motion.button>
              ))}
            </div>
            <label className="field-label">{t('¿De dónde eres?')}</label>
            <div className="country-grid">
              {COUNTRIES.map((c) => (
                <button key={c.code} className={`chip-btn ${c.code === country ? 'on' : ''}`} onClick={() => setCountry(c.code)}>
                  {c.flag} {t(c.name)}
                </button>
              ))}
            </div>
            <motion.button className="btn3d play-btn wide shine" whileTap={{ scale: 0.95 }} disabled={saving} onClick={finish}>
              ▶ {t('¡A jugar!')}
            </motion.button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

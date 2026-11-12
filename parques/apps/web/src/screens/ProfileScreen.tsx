import { ITEMS } from '@parques/engine';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar, photoToDataUrl } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { ACHIEVEMENTS, achievement } from '@parques/engine';
import { MAX_LEVEL } from '@parques/engine';
import { useLevel, useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { useFx } from '../stores/fxStore';
import { AVATARS } from '../lib/avatars';
import { COUNTRIES } from '../lib/countries';
import { useT } from '../lib/i18n';

export function ProfileScreen() {
  const p = useProfile();
  const lvl = useLevel();
  const t = useT();
  const go = useApp((a) => a.go);
  const toast = useFx((f) => f.toast);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(p.name);
  const file = useRef<HTMLInputElement>(null);
  const s = p.stats;
  const pct = s.games ? Math.round((s.wins / s.games) * 100) : 0;
  const stats = [
    ['🎲', t('Partidas'), s.games],
    ['🏆', t('Victorias'), s.wins],
    ['📈', t('% de victoria'), `${pct}%`],
    ['💥', t('Capturas'), s.captures],
    ['👑', t('Coronadas'), s.crowned],
    ['🌬️', t('Soplos'), s.soplos],
    ['🔥', t('Mejor racha'), s.bestWinStreak],
    ['🪙', t('Monedas ganadas'), s.coinsWon.toLocaleString()],
  ] as const;
  const recent = Object.entries(p.achievements)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => achievement(id))
    .filter((a) => !!a);

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await photoToDataUrl(f);
      p.setIdentity({ photo: url });
      toast({ icon: '📸', title: t('¡Foto actualizada!') });
    } catch {
      toast({ icon: '⚠️', title: t('No se pudo leer la imagen') });
    }
  };

  return (
    <div className="screen profile-screen with-nav">
      <TopBar back title={t('Perfil')} />
      <motion.div className="card glossy profile-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="photo-btn" onClick={() => file.current?.click()} aria-label={t('Cambiar foto')}>
          <Avatar emoji={p.avatar} photo={p.photo} frameId={p.equipped.frame} size={96} level={lvl.level} ring={lvl.max ? 1 : lvl.into / lvl.need} />
          <span className="photo-cam">📷</span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <div className="pc-info">
          <h2>{p.name}</h2>
          <div className="pc-sub">
            {COUNTRIES.find((c) => c.code === p.country)?.flag} {t('Nivel')} {lvl.level}/{MAX_LEVEL}
            {!lvl.max ? ` · ${lvl.into.toLocaleString()}/${lvl.need.toLocaleString()} XP` : ''}
          </div>
          <div className="pc-code">{t('Código de amigo')}: <b>{p.id}</b></div>
          <button className="btn3d small ghost" onClick={() => setEdit(true)}>
            ✏️ {t('Editar')}
          </button>
        </div>
      </motion.div>

      <h3 className="section-title">{t('Estadísticas')}</h3>
      <div className="stat-grid">
        {stats.map(([icon, label, value], i) => (
          <motion.div key={label} className="stat card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.04 }}>
            <span className="stat-icon">{icon}</span>
            <span className="stat-val">{value}</span>
            <span className="stat-lbl">{label}</span>
          </motion.div>
        ))}
      </div>

      <h3 className="section-title">
        {t('Logros')} <small>{Object.keys(p.achievements).length.toLocaleString()}/{ACHIEVEMENTS.length.toLocaleString()}</small>
      </h3>
      <div className="badge-grid">
        {recent.length === 0 ? <p className="rule-note">{t('Juega tu primera partida para desbloquear logros.')}</p> : null}
        {recent.map((a) => (
          <div key={a!.id} className="badge got">
            <span className="badge-icon">{a!.badge}</span>
            <span className="badge-name">{t(a!.name.replace(/ [IVXL]+$/, ''))} {a!.name.match(/[IVXL]+$/)?.[0]}</span>
          </div>
        ))}
      </div>
      <button className="btn3d purple" onClick={() => go('achievements')}>
        🏅 {t('Ver todos los logros')}
      </button>

      <Modal open={edit} onClose={() => setEdit(false)}>
        <h2 className="modal-title">{t('Tu perfil')}</h2>
        <input className="text-input" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} placeholder={t('Tu nombre')} />
        <div className="photo-row">
          <button className="btn3d small blue" onClick={() => file.current?.click()}>
            📷 {t('Subir foto')}
          </button>
          {p.photo ? (
            <button className="btn3d small ghost" onClick={() => p.setIdentity({ photo: null })}>
              🗑️ {t('Quitar foto')}
            </button>
          ) : null}
        </div>
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button key={a} className={a === p.avatar && !p.photo ? 'on' : ''} onClick={() => p.setIdentity({ avatar: a, photo: null })}>
              {a}
            </button>
          ))}
        </div>
        <div className="avatar-pick art">
          {ITEMS.filter((it) => it.category === 'avatar' && p.owned.includes(it.id)).map((it) => (
            <button key={it.id} className={p.avatar === `av:${it.id}` ? 'on' : ''} onClick={() => p.equip(it.id)}>
              <Avatar emoji={`av:${it.id}`} size={46} />
            </button>
          ))}
          <button className="more" onClick={() => go('shop')}>
            ➕
          </button>
        </div>
        <select className="text-input" value={p.country} onChange={(e) => p.setIdentity({ country: e.target.value })}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {t(c.name)}
            </option>
          ))}
        </select>
        <button className="btn3d green wide" onClick={() => { p.setIdentity({ name: name.trim() || t('Jugador') }); setEdit(false); }}>
          {t('Guardar')}
        </button>
      </Modal>
      <BottomNav />
    </div>
  );
}

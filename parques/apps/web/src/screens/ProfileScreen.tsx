import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { ACHIEVEMENTS } from '../meta/achievements';
import { useLevel, useProfile } from '../stores/profileStore';
import { AVATARS } from '../lib/avatars';
import { COUNTRIES } from '../lib/countries';
import { useT } from '../lib/i18n';

export function ProfileScreen() {
  const p = useProfile();
  const lvl = useLevel();
  const t = useT();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(p.name);
  const s = p.stats;
  const pct = s.games ? Math.round((s.wins / s.games) * 100) : 0;
  const stats = [
    ['🎲', t('Partidas'), s.games],
    ['🏆', t('Victorias'), s.wins],
    ['📈', t('% de victoria'), `${pct}%`],
    ['💥', t('Capturas'), s.captures],
    ['👑', 'Coronadas', s.crowned],
    ['🌬️', 'Soplos', s.soplos],
    ['🔥', 'Mejor racha', s.bestWinStreak],
    ['🌐', 'Online', s.onlineGames],
  ] as const;

  return (
    <div className="screen profile-screen with-nav">
      <TopBar back title={t('Perfil')} />
      <motion.div className="card glossy profile-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Avatar emoji={p.avatar} frameId={p.equipped.frame} size={92} level={lvl.level} ring={lvl.into / lvl.need} />
        <div className="pc-info">
          <h2>{p.name}</h2>
          <div className="pc-sub">
            {COUNTRIES.find((c) => c.code === p.country)?.flag} {t('Nivel')} {lvl.level} · {lvl.into}/{lvl.need} XP
          </div>
          <div className="pc-code">Código de amigo: <b>{p.id}</b></div>
          <button className="btn3d small ghost" onClick={() => setEdit(true)}>
            ✏️ Editar
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
        {t('Logros')} <small>{Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}</small>
      </h3>
      <div className="badge-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = !!p.achievements[a.id];
          return (
            <div key={a.id} className={`badge ${got ? 'got' : ''}`} title={a.desc}>
              <span className="badge-icon">{got ? a.badge : '🔒'}</span>
              <span className="badge-name">{a.name}</span>
              <span className="badge-desc">{a.desc}</span>
            </div>
          );
        })}
      </div>

      <Modal open={edit} onClose={() => setEdit(false)}>
        <h2 className="modal-title">Tu perfil</h2>
        <input className="text-input" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button key={a} className={a === p.avatar ? 'on' : ''} onClick={() => p.setIdentity({ avatar: a })}>
              {a}
            </button>
          ))}
        </div>
        <select className="text-input" value={p.country} onChange={(e) => p.setIdentity({ country: e.target.value })}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <button className="btn3d green wide" onClick={() => { p.setIdentity({ name: name.trim() || 'Jugador' }); setEdit(false); }}>
          Guardar
        </button>
      </Modal>
      <BottomNav />
    </div>
  );
}

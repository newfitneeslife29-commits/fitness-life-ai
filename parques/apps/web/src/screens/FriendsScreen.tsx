import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';

export function FriendsScreen() {
  const t = useT();
  const p = useProfile();
  const go = useApp((a) => a.go);
  const toast = useFx((f) => f.toast);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const add = () => {
    const id = code.trim().toUpperCase();
    if (id.length < 6) return toast({ icon: '🤔', title: 'Ese código no parece válido' });
    if (id === p.id) return toast({ icon: '😅', title: 'Ese es tu propio código' });
    p.addFriend({ id, name: name.trim() || `Parcero ${id.slice(0, 3)}`, avatar: '🙂' });
    toast({ icon: '🤝', title: '¡Amigo agregado!', sub: 'Lo verás en el ranking de amigos' });
    setCode('');
    setName('');
  };

  const share = async () => {
    const text = `¡Juguemos Parqués! Mi código de amigo es ${p.id}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ icon: '📋', title: 'Código copiado' });
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="screen friends-screen with-nav">
      <TopBar back title={t('Amigos')} />
      <section className="card glossy setup-card">
        <h3>Tu código</h3>
        <div className="friend-code">{p.id}</div>
        <button className="btn3d small blue" onClick={share}>
          📤 Compartir
        </button>
      </section>
      <section className="card glossy setup-card">
        <h3>Agregar amigo</h3>
        <input className="text-input" placeholder="Código de tu amigo" value={code} onChange={(e) => setCode(e.target.value)} maxLength={8} />
        <input className="text-input" placeholder="¿Cómo se llama? (opcional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={14} />
        <button className="btn3d small green" onClick={add}>
          ➕ Agregar
        </button>
      </section>
      <section className="card glossy setup-card">
        <h3>Mis amigos ({p.friends.length})</h3>
        {p.friends.length === 0 ? <p className="rule-note">Todavía no tienes amigos agregados. ¡Comparte tu código!</p> : null}
        {p.friends.map((f) => (
          <motion.div key={f.id} className="friend-row" layout>
            <Avatar emoji={f.avatar} size={40} />
            <span className="fr-name">
              {f.name}
              <small>{f.id}</small>
            </span>
            <button className="btn3d small purple" onClick={() => go('online')}>
              🔐 Invitar
            </button>
            <button className="round-btn small" onClick={() => p.removeFriend(f.id)} aria-label="Quitar">
              ✕
            </button>
          </motion.div>
        ))}
      </section>
      <BottomNav />
    </div>
  );
}

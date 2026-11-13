import { isVip } from '@parques/engine';
import { motion } from 'framer-motion';
import { useLevel, useProfile } from '../stores/profileStore';
import { useApp } from '../stores/appStore';
import { Avatar } from './Avatar';
import { CurrencyPill } from './Counter';
import { play } from '../audio/audio';
import { tr } from '../lib/i18n';

/** Barra superior: avatar con nivel y XP, monedas, gemas y ajustes. */
export function TopBar({ back, title }: { back?: boolean; title?: string }) {
  const p = useProfile();
  const lvl = useLevel();
  const go = useApp((a) => a.go);
  return (
    <header className="topbar">
      {back ? (
        <motion.button className="round-btn" whileTap={{ scale: 0.85 }} onClick={() => { play('tap'); go('lobby'); }} aria-label="Volver">
          ←
        </motion.button>
      ) : (
        <motion.button className="topbar-me" whileTap={{ scale: 0.95 }} onClick={() => { play('tap'); go('profile'); }}>
          <Avatar emoji={p.avatar} photo={p.photo} frameId={p.equipped.frame} size={46} level={lvl.level} ring={lvl.max ? 1 : lvl.into / lvl.need} />
          <div className="topbar-name">
            <span>{p.name}</span>
            {isVip(p.vipUntil, Date.now()) ? <span className="vip-badge">💎 VIP</span> : null}
            <div className="xpbar">
              <motion.div className="xpbar-fill" initial={false} animate={{ width: `${lvl.max ? 100 : (lvl.into / lvl.need) * 100}%` }} />
            </div>
            <small className="topbar-xp">
              {tr('Nivel {n}', { n: lvl.level })} · {lvl.max ? tr('MÁXIMO') : `${lvl.into.toLocaleString()}/${lvl.need.toLocaleString()} XP`}
            </small>
          </div>
        </motion.button>
      )}
      {title ? <h2 className="topbar-title">{title}</h2> : <span className="topbar-spacer" />}
      <div className="topbar-right">
        <CurrencyPill kind="coin" value={p.coins} onPlus={() => go('shop')} />
        <CurrencyPill kind="gem" value={p.gems} onPlus={() => go('shop')} />
        {!back ? (
          <motion.button className="round-btn" whileTap={{ scale: 0.85, rotate: 90 }} onClick={() => { play('tap'); go('settings'); }} aria-label="Ajustes">
            ⚙️
          </motion.button>
        ) : null}
      </div>
    </header>
  );
}

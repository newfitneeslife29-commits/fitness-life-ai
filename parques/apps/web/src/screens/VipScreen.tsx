import { motion } from 'framer-motion';
import { formatUsd, isVip, PRODUCTS, vipDaysLeft } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../stores/profileStore';
import { purchase } from '../lib/payments';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { VIP_PERKS as PERKS } from '../game/tutorialData';



/** Pase VIP mensual (30 días). */
export function VipScreen() {
  const t = useT();
  const p = useProfile();
  const now = Date.now();
  const vip = isVip(p.vipUntil, now);
  const prod = PRODUCTS.find((x) => x.id === 'vip-30')!;
  return (
    <div className="screen vip-screen">
      <TopBar back title={t('Pase VIP')} />
      <motion.div className="vip-hero card glossy" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <motion.div className="vip-crown" animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          💎
        </motion.div>
        <Avatar emoji={p.avatar} photo={p.photo} frameId="frame-vip" size={84} />
        <h2>{vip ? t('¡Eres VIP!') : t('Hazte VIP')}</h2>
        {vip ? <p className="vip-left">{t('Te quedan {n} días', { n: vipDaysLeft(p.vipUntil, now) })}</p> : null}
        <ul className="vip-perks">
          {PERKS.map((x, i) => (
            <motion.li key={x.text} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.08 }}>
              <span>{x.icon}</span> {t(x.text)}
            </motion.li>
          ))}
        </ul>
        <motion.button className="btn3d play-btn wide shine" whileTap={{ scale: 0.94 }} onClick={() => { play('tap'); void purchase('vip-30'); }}>
          {vip ? t('Renovar 30 días') : t('Activar 30 días')} · {formatUsd(prod.usdCents)}
        </motion.button>
        <small className="rule-note">{t('Pago único por 30 días; no se renueva solo.')}</small>
      </motion.div>
    </div>
  );
}

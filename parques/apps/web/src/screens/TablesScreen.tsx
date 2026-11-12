import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { TABLES, payouts, type TableId, type TableTier } from '@parques/engine';
import { useApp } from '../stores/appStore';
import { useLevel, useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useOnline } from '../lib/online';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

export const TABLE_GRADS: Record<TableId, [string, string]> = {
  barrio: ['#34d76b', '#0f7a3c'],
  ciudad: ['#4f9bff', '#1d3fb8'],
  capital: ['#b678ff', '#5a1fb0'],
  leyenda: ['#ffcf3f', '#d9480f'],
  elite: ['#5eead4', '#0e7490'],
  top: ['#ff5f6d', '#7f1d1d'],
};

/** Texto del reparto del premio para una mesa. */
export function prizeLine(t: (s: string, v?: Record<string, string | number>) => string, entry: number, players: number): string {
  return payouts(entry, players)
    .map((x, i) => (x > 0 ? `${i + 1}º ${x.toLocaleString()}` : null))
    .filter(Boolean)
    .join(' · ');
}

export function TablesScreen() {
  const t = useT();
  const go = useApp((a) => a.go);
  const p = useProfile();
  const lvl = useLevel();
  const rules = useSettings((s) => s.houseRules);
  const online = useOnline();
  const toast = useFx((f) => f.toast);
  const [players, setPlayers] = useState<2 | 4>(4);

  const [busy, setBusy] = useState(false);

  /** La partida la juega el SERVIDOR: cobra la entrada y aplica los premios en la cuenta. */
  const playTier = async (tier: TableTier) => {
    if (busy) return;
    if (tier.onlineOnly) return go('online');
    if (lvl.level < tier.minLevel) return toast({ icon: '🔒', title: t('Necesitas nivel {n}', { n: tier.minLevel }) });
    if (p.coins < tier.entry) {
      toast({ icon: '🪙', title: t('Te faltan monedas'), sub: t('Cómpralas en la tienda o reclama la recompensa diaria') });
      return go('shop');
    }
    setBusy(true);
    play('coin');
    const err = await online.playAi({ table: tier.id, players, rules: { ...rules } });
    setBusy(false);
    if (err) toast({ icon: '⚠️', title: t(err) });
  };

  return (
    <div className="screen tables-screen">
      <TopBar back title={t('Elige tu mesa')} />
      <div className="segmented big">
        <button className={players === 4 ? 'on' : ''} onClick={() => setPlayers(4)}>
          👥 {t('4 jugadores')}
        </button>
        <button className={players === 2 ? 'on' : ''} onClick={() => setPlayers(2)}>
          ⚔️ 1 vs 1
        </button>
      </div>
      <p className="rule-note strong">{t('Cada jugador paga la entrada. El 1º se lleva su entrada + el 75 % de lo que pierden los rivales y 5 gemas; el 2º recupera su entrada.')}</p>
      <div className="table-list">
        {TABLES.map((tier, i) => {
          const locked = lvl.level < tier.minLevel;
          const poor = p.coins < tier.entry;
          return (
            <motion.button
              key={tier.id}
              className={`table-card ${locked ? 'locked' : ''}`}
              style={{ ['--ta' as string]: TABLE_GRADS[tier.id][0], ['--tb' as string]: TABLE_GRADS[tier.id][1] }}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => playTier(tier)}
            >
              <span className="tc-emoji">{tier.emoji}</span>
              <span className="tc-body">
                <span className="tc-name">{t(tier.name)}</span>
                <span className="tc-blurb">{t(tier.blurb)}</span>
                <span className="tc-meta">
                  {tier.onlineOnly ? `🌐 ${t('Solo online')}` : `🤖 ${t(tier.ai === 'easy' ? 'Fácil' : tier.ai === 'normal' ? 'Normal' : 'Experto')}`} · ⏱ {tier.turnSeconds}s · {t('Nivel')} {tier.minLevel}+
                </span>
                <span className="tc-meta">🏆 {prizeLine(t, tier.entry, players)}</span>
              </span>
              <span className="tc-money">
                <span className="tc-prize">
                  <CoinIcon size={18} /> {payouts(tier.entry, players)[0]!.toLocaleString()} <GemIcon size={16} />5
                </span>
                <span className={`tc-entry ${poor ? 'poor' : ''}`}>
                  {t('Entrada')}: <CoinIcon size={15} /> {tier.entry.toLocaleString()}
                </span>
              </span>
              {locked ? <span className="tc-lock">🔒 {t('Nivel')} {tier.minLevel}</span> : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

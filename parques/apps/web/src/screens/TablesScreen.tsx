import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { CoinIcon } from '../components/Counter';
import { TABLES, type TableTier } from '../meta/economy';
import { useApp } from '../stores/appStore';
import { useLevel, useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useGame, type MatchConfig, type SeatConfig } from '../stores/gameStore';
import { useFx } from '../stores/fxStore';
import { AVATARS, BOT_NAMES } from '../lib/avatars';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

const GRADS: Record<TableTier['id'], [string, string]> = {
  barrio: ['#34d76b', '#0f7a3c'],
  ciudad: ['#4f9bff', '#1d3fb8'],
  capital: ['#b678ff', '#5a1fb0'],
  leyenda: ['#ffcf3f', '#d9480f'],
};

export function TablesScreen() {
  const t = useT();
  const go = useApp((a) => a.go);
  const p = useProfile();
  const lvl = useLevel();
  const rules = useSettings((s) => s.houseRules);
  const start = useGame((g) => g.start);
  const toast = useFx((f) => f.toast);
  const [players, setPlayers] = useState<2 | 4>(4);

  const play2 = (tier: TableTier) => {
    if (lvl.level < tier.minLevel) return toast({ icon: '🔒', title: `Necesitas nivel ${tier.minLevel}` });
    if (!p.pay(tier.entry)) return toast({ icon: '🪙', title: 'Te faltan monedas', sub: 'Reclama la recompensa diaria o completa misiones' });
    play('coin');
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const sides = players === 2 ? [0, 2] : [0, 1, 2, 3];
    const seats: SeatConfig[] = sides.map((side, k) => ({
      name: k === 0 ? p.name : names[k]!,
      side,
      kind: k === 0 ? 'human' : 'bot',
      level: tier.ai,
      avatar: k === 0 ? p.avatar : AVATARS[(k * 3 + 2) % AVATARS.length]!,
    }));
    const config: MatchConfig = { sides: 4, seats, mode: 'ai', table: tier.id, turnSeconds: tier.turnSeconds, timeLimitSec: 0, rules: { ...rules } };
    start(config);
    go('game');
  };

  return (
    <div className="screen tables-screen">
      <TopBar back title={t('Elige tu mesa')} />
      <div className="segmented big">
        <button className={players === 4 ? 'on' : ''} onClick={() => setPlayers(4)}>
          👥 4 jugadores
        </button>
        <button className={players === 2 ? 'on' : ''} onClick={() => setPlayers(2)}>
          ⚔️ 1 vs 1
        </button>
      </div>
      <div className="table-list">
        {TABLES.map((tier, i) => {
          const locked = lvl.level < tier.minLevel;
          const poor = p.coins < tier.entry;
          return (
            <motion.button
              key={tier.id}
              className={`table-card ${locked ? 'locked' : ''}`}
              style={{ ['--ta' as string]: GRADS[tier.id][0], ['--tb' as string]: GRADS[tier.id][1] }}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => play2(tier)}
            >
              <span className="tc-emoji">{tier.emoji}</span>
              <span className="tc-body">
                <span className="tc-name">{tier.name}</span>
                <span className="tc-blurb">{tier.blurb}</span>
                <span className="tc-meta">
                  🤖 {tier.ai === 'easy' ? 'Fácil' : tier.ai === 'normal' ? 'Normal' : 'Experto'} · ⏱ {tier.turnSeconds}s
                </span>
              </span>
              <span className="tc-money">
                <span className="tc-prize">
                  🏆 <CoinIcon size={18} /> {tier.prizes[0]!.toLocaleString('es-CO')}
                </span>
                <span className={`tc-entry ${poor ? 'poor' : ''}`}>
                  {t('Entrada')}: <CoinIcon size={15} /> {tier.entry.toLocaleString('es-CO')}
                </span>
              </span>
              {locked ? <span className="tc-lock">🔒 Nivel {tier.minLevel}</span> : null}
            </motion.button>
          );
        })}
      </div>
      <p className="rule-note">Reglas de la casa: {rules.soplar ? 'con soplo' : 'sin soplo'} · {rules.triplePairPenalty ? 'tres pares a la cárcel' : 'sin castigo de tres pares'} · {rules.jailAttempts} intento(s). Cámbialas en Ajustes.</p>
    </div>
  );
}

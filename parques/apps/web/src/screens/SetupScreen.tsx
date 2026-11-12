import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { AiLevel, Color } from '@parques/engine';
import { COLORS_4, COLORS_6 } from '@parques/engine';
import { AVATARS, BOT_NAMES } from '../lib/avatars';
import { useApp } from '../stores/appStore';
import { useGame, type MatchConfig, type SeatConfig } from '../stores/gameStore';
import { useSettings } from '../stores/settingsStore';
import { useProfile } from '../stores/profileStore';
import { TopBar } from '../components/TopBar';
import { useOnline } from '../lib/online';
import { useLevel } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { TABLES, payouts, type TableId } from '@parques/engine';
import { CoinIcon } from '../components/Counter';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

const TITLES = { ai: 'Práctica libre', local: 'Partida local', teams: 'Parejas 2 vs 2', quick: 'Modo Rápido', online: 'Online' } as const;
const COLOR_NAME: Record<Color, string> = { amarillo: 'Amarillo', azul: 'Azul', rojo: 'Rojo', verde: 'Verde', morado: 'Morado', naranja: 'Naranja' };

function sidesFor(count: number): number[] {
  if (count === 2) return [0, 2];
  if (count === 3) return [0, 1, 2];
  return Array.from({ length: count }, (_, i) => i);
}

export function SetupScreen() {
  const { setupMode: mode, go } = useApp();
  const t = useT();
  const start = useGame((g) => g.start);
  const [count, setCount] = useState(mode === 'teams' ? 4 : mode === 'quick' ? 2 : 4);
  const [kinds, setKinds] = useState<('human' | 'bot')[]>(() => Array.from({ length: 6 }, (_, i) => (i === 0 || (mode === 'local' && i === 1) ? 'human' : 'bot')));
  const [level, setLevel] = useState<AiLevel>('normal');
  const defaults = useSettings();
  const me = useProfile();
  const [soplar, setSoplar] = useState(defaults.houseRules.soplar);
  const [triple, setTriple] = useState(defaults.houseRules.triplePairPenalty);
  const [attempts, setAttempts] = useState(defaults.houseRules.jailAttempts);
  const [turnSeconds, setTurnSeconds] = useState(defaults.turnSeconds);
  const lvl = useLevel();
  const toast = useFx((f) => f.toast);
  const [tierId, setTierId] = useState<TableId>('barrio');
  const tiers = TABLES.filter((t) => !t.onlineOnly);

  const sides = count === 6 ? 6 : 4;
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const seatSides = useMemo(() => sidesFor(count), [count]);
  const counts = mode === 'teams' ? [4] : mode === 'quick' ? [2, 3, 4] : [2, 3, 4, 6];
  const humans = seatSides.filter((_, k) => kinds[k] === 'human').length;

  // Contra la máquina (un solo humano) siempre se paga la entrada de la mesa elegida.
  const staked = humans === 1;
  const tier = TABLES.find((t) => t.id === tierId)!;

  const onStart = async () => {
    if (staked) {
      // Contra la máquina: la partida la juega el servidor (cobra la entrada y paga los premios).
      if (lvl.level < tier.minLevel) return toast({ icon: '🔒', title: t('Necesitas nivel {n}', { n: tier.minLevel }) });
      if (me.coins < tier.entry) return toast({ icon: '🪙', title: t('Te faltan monedas'), sub: t('Cómpralas en la tienda o reclama la recompensa diaria') });
      play('coin');
      const err = await useOnline.getState().playAi({
        table: tier.id,
        players: count as 2 | 3 | 4 | 6,
        teams: mode === 'teams',
        quick: mode === 'quick',
        level,
        rules: { soplar, triplePairPenalty: triple, jailAttempts: attempts },
      });
      if (err) toast({ icon: '⚠️', title: t(err) });
      return;
    }
    // Varias personas en el mismo celular (o solo máquinas): partida local, gratis y sin premios.
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    let humanN = 0;
    const seats: SeatConfig[] = seatSides.map((side, k) => {
      const kind = kinds[k]!;
      const name = kind === 'human' ? (humans > 1 ? t('Jugador {n}', { n: ++humanN }) : me.name) : names[k % names.length]!;
      const avatar = kind === 'human' ? (humans > 1 ? AVATARS[k % AVATARS.length]! : me.avatar) : AVATARS[(k + 4) % AVATARS.length]!;
      return { name, side, kind, level, avatar };
    });
    const config: MatchConfig = {
      sides,
      seats,
      mode,
      table: staked ? tier.id : null,
      entry: staked ? tier.entry : 0,
      turnSeconds,
      timeLimitSec: mode === 'quick' ? 300 : 0,
      rules: {
        soplar,
        triplePairPenalty: triple,
        jailAttempts: attempts,
        teams: mode === 'teams',
        piecesPerPlayer: mode === 'quick' ? 2 : 4,
      },
    };
    play('tap');
    start(config);
    go('game');
  };

  return (
    <div className="screen setup-screen">
      <TopBar back title={t(TITLES[mode])} />

      <section className="card setup-card">
        <h3>{t('Jugadores')}</h3>
        <div className="segmented">
          {counts.map((n) => (
            <button key={n} className={n === count ? 'on' : ''} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="seat-list">
          {seatSides.map((side, k) => (
            <motion.div layout key={`${count}-${side}`} className="seat-line" style={{ ['--pc' as string]: `var(--${colors[side]})` }}>
              <span className="seat-swatch" />
              <span className="seat-color">
                {t(COLOR_NAME[colors[side]!])}
                {mode === 'teams' ? <small> · {t('Pareja {n}', { n: (side % 2) + 1 })}</small> : null}
              </span>
              <div className="segmented small">
                <button className={kinds[k] === 'human' ? 'on' : ''} onClick={() => setKinds((ks) => ks.map((x, i) => (i === k ? 'human' : x)))}>
                  🙋 {t('Humano')}
                </button>
                <button
                  className={kinds[k] === 'bot' ? 'on' : ''}
                  onClick={() => setKinds((ks) => ks.map((x, i) => (i === k ? 'bot' : x)))}
                >
                  🤖 {t('Máquina')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="row">
          <span>{t('Nivel de la máquina')}</span>
          <div className="segmented small">
            {(['easy', 'normal', 'expert'] as const).map((l) => (
              <button key={l} className={l === level ? 'on' : ''} onClick={() => setLevel(l)}>
                {t(l === 'easy' ? 'Fácil' : l === 'normal' ? 'Normal' : 'Experto')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {staked ? (
        <section className="card glossy setup-card">
          <h3>🪙 {t('Mesa')}</h3>
          <div className="stake-row">
            {tiers.map((tt) => (
              <button key={tt.id} className={`stake ${tt.id === tierId ? 'on' : ''} ${lvl.level < tt.minLevel ? 'locked' : ''}`} onClick={() => setTierId(tt.id)}>
                <span>{tt.emoji}</span>
                <b>{t(tt.name)}</b>
                <small><CoinIcon size={13} /> {tt.entry.toLocaleString()}</small>
                {lvl.level < tt.minLevel ? <em>🔒 {t('Nivel')} {tt.minLevel}</em> : null}
              </button>
            ))}
          </div>
          <p className="rule-note">
            {t('Entrada')}: {tier.entry.toLocaleString()} · {t('Premios')}: {payouts(tier.entry, count, mode === 'teams').filter((x) => x > 0).map((x, i) => `${i + 1}º ${x.toLocaleString()}`).join(' · ')} · {t('1º gana 5 gemas')}
          </p>
        </section>
      ) : (
        <p className="rule-note">{t('Partida sin apuesta: no da monedas ni gemas.')}</p>
      )}

      <section className="card setup-card">
        <h3>{t('Reglas de la casa')}</h3>
        <Toggle label={`🌬️ ${t('Soplar')}`} value={soplar} onChange={setSoplar} />
        <Toggle label={`🚨 ${t('Tres pares a la cárcel')}`} value={triple} onChange={setTriple} />
        <div className="row">
          <span>{t('Intentos para salir')}</span>
          <div className="segmented small">
            {[1, 2, 3].map((n) => (
              <button key={n} className={n === attempts ? 'on' : ''} onClick={() => setAttempts(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span>{t('Tiempo por turno')}</span>
          <div className="segmented small">
            {[10, 20, 30, 0].map((n) => (
              <button key={n} className={n === turnSeconds ? 'on' : ''} onClick={() => setTurnSeconds(n)}>
                {n === 0 ? '∞' : `${n}s`}
              </button>
            ))}
          </div>
        </div>
        <p className="rule-note">{t('Doble 1 o doble 6 sacan todas las fichas; cualquier otro par saca 1 o 2.')}</p>
      </section>

      <motion.button className="btn3d play-btn" whileTap={{ scale: 0.93 }} onClick={onStart}>
        {humans === 0 ? `👀 ${t('Ver a la máquina jugar')}` : t('¡A jugar!')}
      </motion.button>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="row toggle-row" onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <span>{label}</span>
      <span className={`switch ${value ? 'on' : ''}`}>
        <motion.span className="knob" layout transition={{ type: 'spring', stiffness: 600, damping: 30 }} />
      </span>
    </button>
  );
}

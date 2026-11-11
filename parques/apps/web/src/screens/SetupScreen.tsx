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

  const sides = count === 6 ? 6 : 4;
  const colors = sides === 4 ? COLORS_4 : COLORS_6;
  const seatSides = useMemo(() => sidesFor(count), [count]);
  const counts = mode === 'teams' ? [4] : mode === 'quick' ? [2, 3, 4] : [2, 3, 4, 6];
  const humans = seatSides.filter((_, k) => kinds[k] === 'human').length;

  const onStart = () => {
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    let humanN = 0;
    const seats: SeatConfig[] = seatSides.map((side, k) => {
      const kind = kinds[k]!;
      const name = kind === 'human' ? (humans > 1 ? `Jugador ${++humanN}` : me.name) : names[k % names.length]!;
      const avatar = kind === 'human' ? (humans > 1 ? AVATARS[k % AVATARS.length]! : me.avatar) : AVATARS[(k + 4) % AVATARS.length]!;
      return { name, side, kind, level, avatar };
    });
    const config: MatchConfig = {
      sides,
      seats,
      mode,
      table: null,
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
      <TopBar back title={TITLES[mode]} />

      <section className="card setup-card">
        <h3>Jugadores</h3>
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
                {COLOR_NAME[colors[side]!]}
                {mode === 'teams' ? <small> · Pareja {(side % 2) + 1}</small> : null}
              </span>
              <div className="segmented small">
                <button className={kinds[k] === 'human' ? 'on' : ''} onClick={() => setKinds((ks) => ks.map((x, i) => (i === k ? 'human' : x)))}>
                  🙋 Humano
                </button>
                <button
                  className={kinds[k] === 'bot' ? 'on' : ''}
                  onClick={() => setKinds((ks) => ks.map((x, i) => (i === k ? 'bot' : x)))}
                >
                  🤖 Máquina
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="row">
          <span>Nivel de la máquina</span>
          <div className="segmented small">
            {(['easy', 'normal', 'expert'] as const).map((l) => (
              <button key={l} className={l === level ? 'on' : ''} onClick={() => setLevel(l)}>
                {l === 'easy' ? 'Fácil' : l === 'normal' ? 'Normal' : 'Experto'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card setup-card">
        <h3>Reglas de la casa</h3>
        <Toggle label="🌬️ Soplar" value={soplar} onChange={setSoplar} />
        <Toggle label="🚨 Tres pares a la cárcel" value={triple} onChange={setTriple} />
        <div className="row">
          <span>Intentos para salir</span>
          <div className="segmented small">
            {[1, 2, 3].map((n) => (
              <button key={n} className={n === attempts ? 'on' : ''} onClick={() => setAttempts(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span>Tiempo por turno</span>
          <div className="segmented small">
            {[10, 20, 30, 0].map((n) => (
              <button key={n} className={n === turnSeconds ? 'on' : ''} onClick={() => setTurnSeconds(n)}>
                {n === 0 ? '∞' : `${n}s`}
              </button>
            ))}
          </div>
        </div>
        <p className="rule-note">Doble 1 o doble 6 sacan todas las fichas; cualquier otro par saca 1 o 2.</p>
      </section>

      <motion.button className="btn3d play-btn" whileTap={{ scale: 0.93 }} onClick={onStart}>
        {humans === 0 ? '👀 Ver a la máquina jugar' : '¡A jugar!'}
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

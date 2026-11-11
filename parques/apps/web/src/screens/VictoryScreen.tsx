import { motion } from 'framer-motion';
import { Confetti } from '../components/Confetti';
import { humanSeat, useGame } from '../stores/gameStore';
import { useApp } from '../stores/appStore';

const COINS = [150, 60, 20, 0, 0, 0];
const XP = [60, 40, 25, 15, 10, 10];

export function VictoryScreen() {
  const { game, config, rematch, quit } = useGame();
  const go = useApp((a) => a.go);
  if (!game || !config) return null;

  const ranking = game.ranking;
  const podium = [ranking[1], ranking[0], ranking[2]].filter((x): x is number => x !== undefined);
  const heights = { 0: 150, 1: 110, 2: 80 } as Record<number, number>;
  const me = game.players.findIndex((_, i) => humanSeat(config, game, i));
  const myPlace = me >= 0 ? ranking.indexOf(me) : -1;
  const won = game.rules.teams && me >= 0 ? game.players[ranking[0]!]!.team === game.players[me]!.team : myPlace === 0;
  const avatar = (i: number) => config.seats.find((s) => s.side === game.players[i]!.side)!.avatar;

  return (
    <div className="screen victory-screen">
      <Confetti />
      <motion.h1 className="victory-title" initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
        {me < 0 ? '¡Partida terminada!' : won ? '¡Ganaste, parce! 🎉' : myPlace >= 0 ? `Quedaste ${myPlace + 1}º` : '¡Buena partida!'}
      </motion.h1>

      <div className="podium">
        {podium.map((i) => {
          const place = ranking.indexOf(i);
          const p = game.players[i]!;
          return (
            <motion.div key={i} className="podium-col" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + (2 - place) * 0.25 }}>
              {place === 0 ? (
                <motion.div className="podium-crown" animate={{ y: [0, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  👑
                </motion.div>
              ) : null}
              <div className="podium-avatar" style={{ ['--pc' as string]: `var(--${p.color})` }}>
                {avatar(i)}
              </div>
              <div className="podium-name">{p.name}</div>
              <div className="podium-block" style={{ height: heights[place], ['--pc' as string]: `var(--${p.color})` }}>
                {place + 1}º
              </div>
            </motion.div>
          );
        })}
      </div>

      {myPlace >= 0 ? (
        <motion.div className="rewards card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
          <div className="reward">
            <span className="reward-icon">🪙</span>
            <span className="reward-val">+{COINS[myPlace]}</span>
            <span className="reward-lbl">monedas</span>
          </div>
          <div className="reward">
            <span className="reward-icon">⭐</span>
            <span className="reward-val">+{XP[myPlace]! + game.players[me]!.stats.captures * 5}</span>
            <span className="reward-lbl">XP</span>
          </div>
          <div className="reward">
            <span className="reward-icon">💥</span>
            <span className="reward-val">{game.players[me]!.stats.captures}</span>
            <span className="reward-lbl">capturas</span>
          </div>
        </motion.div>
      ) : null}

      <div className="results card">
        {ranking.map((i, k) => {
          const p = game.players[i]!;
          return (
            <div key={i} className="result-line" style={{ ['--pc' as string]: `var(--${p.color})` }}>
              <span className="result-place">{k + 1}º</span>
              <span className="seat-swatch" />
              <span className="result-name">{p.name}</span>
              <span className="result-stat">💥 {p.stats.captures}</span>
              <span className="result-stat">🌬️ {p.stats.soplosHechos}</span>
              <span className="result-stat">🎲 {p.stats.pairs} pares</span>
            </div>
          );
        })}
      </div>

      <div className="victory-actions">
        <motion.button className="btn3d green" whileTap={{ scale: 0.93 }} onClick={() => { rematch(); go('game'); }}>
          🔁 Revancha
        </motion.button>
        <motion.button className="btn3d ghost" whileTap={{ scale: 0.93 }} onClick={() => { quit(); go('home'); }}>
          Menú
        </motion.button>
      </div>
      <p className="rule-note">Las monedas y la XP se guardarán en tu perfil a partir de la fase 4.</p>
    </div>
  );
}

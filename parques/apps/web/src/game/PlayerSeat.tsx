import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerState } from '@parques/engine';
import type { Bubble } from '../stores/gameStore';

interface Props {
  player: PlayerState;
  avatar: string;
  active: boolean;
  isBot: boolean;
  level?: string;
  place: number | null;
  crowned: number;
  deadline: number | null;
  totalMs: number;
  bubble?: Bubble;
  align: 'left' | 'right' | 'center';
  team?: number | null;
}

const RING = 2 * Math.PI * 30;

export function PlayerSeat({ player, avatar, active, isBot, level, place, crowned, deadline, totalMs, bubble, align, team }: Props) {
  const color = `var(--${player.color})`;
  return (
    <div className={`seat ${active ? 'active' : ''} align-${align}`} style={{ ['--pc' as string]: color }}>
      <div className="seat-avatar">
        <svg viewBox="0 0 68 68" className="seat-ring">
          <circle cx={34} cy={34} r={30} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={5} />
          {active && deadline ? <TimerRing key={deadline} deadline={deadline} totalMs={totalMs} /> : null}
        </svg>
        <div className="seat-face">{avatar}</div>
        <span className="seat-level">{isBot ? '🤖' : 'Nv 1'}</span>
        {place ? <span className="seat-place">{place}º</span> : null}
      </div>
      <div className="seat-info">
        <div className="seat-name">{player.name}</div>
        <div className="seat-sub">
          <span>👑 {crowned}/{player.pieces.length}</span>
          {level ? <span>{level}</span> : null}
          {team !== null && team !== undefined ? <span>Pareja {team + 1}</span> : null}
        </div>
      </div>
      <AnimatePresence>
        {bubble ? (
          <motion.div
            key={bubble.id}
            className="bubble"
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {bubble.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Anillo del temporizador: se calcula una sola vez por turno y lo anima CSS. */
function TimerRing({ deadline, totalMs }: { deadline: number; totalMs: number }) {
  const [start] = useState(() => {
    const remaining = Math.max(0, deadline - Date.now());
    return { remaining, from: RING * (1 - remaining / totalMs) };
  });
  return (
    <circle
      cx={34}
      cy={34}
      r={30}
      fill="none"
      strokeWidth={5}
      strokeLinecap="round"
      strokeDasharray={RING}
      transform="rotate(-90 34 34)"
      className="timer-ring"
      style={{
        strokeDashoffset: start.from,
        animation: `ring-drain ${start.remaining}ms linear forwards, ring-color ${start.remaining}ms linear forwards`,
        ['--ring-from' as string]: `${start.from}`,
        ['--ring-len' as string]: `${RING}`,
      }}
    />
  );
}

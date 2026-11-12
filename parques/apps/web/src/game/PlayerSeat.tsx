import { tr } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerState } from '@parques/engine';
import type { Bubble } from '../stores/gameStore';
import { Avatar } from '../components/Avatar';
import { isEmote } from './phrases';

interface Props {
  player: PlayerState;
  avatar: string;
  active: boolean;
  isBot: boolean;
  /** Etiqueta bajo el avatar (🤖, 🌐 o nivel). */
  tag: string;
  frameId?: string;
  level?: string;
  place: number | null;
  crowned: number;
  deadline: number | null;
  totalMs: number;
  bubble?: Bubble;
  align: 'left' | 'right' | 'center';
  team?: number | null;
  /** Botón de emotes pegado al avatar (solo en mi asiento). */
  onEmote?: () => void;
  emoteOpen?: boolean;
}

const RING = 2 * Math.PI * 30;

export function PlayerSeat({ player, avatar, active, tag, frameId, level, place, crowned, deadline, totalMs, bubble, align, team, onEmote, emoteOpen }: Props) {
  const color = `var(--${player.color})`;
  return (
    <div className={`seat ${active ? 'active' : ''} align-${align}`} style={{ ['--pc' as string]: color }}>
      <div className="seat-avatar">
        <svg viewBox="0 0 68 68" className="seat-ring">
          <circle cx={34} cy={34} r={30} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={5} />
          {active && deadline ? <TimerRing key={deadline} deadline={deadline} totalMs={totalMs} /> : null}
        </svg>
        {active && deadline ? <Countdown deadline={deadline} /> : null}
        <div className="seat-face-wrap">
          <Avatar emoji={avatar} frameId={frameId} size={46} color={color} />
        </div>
        <span className="seat-level">{tag}</span>
        {place ? <span className="seat-place">{place}º</span> : null}
        {onEmote ? (
          <motion.button
            className={`seat-emote ${emoteOpen ? 'on' : ''}`}
            onClick={onEmote}
            whileTap={{ scale: 0.85 }}
            animate={emoteOpen ? { rotate: 0 } : { rotate: [0, -12, 12, 0] }}
            transition={emoteOpen ? undefined : { duration: 0.6, repeat: Infinity, repeatDelay: 6 }}
            aria-label={tr('Emotes')}
          >
            😀
          </motion.button>
        ) : null}
      </div>
      <div className="seat-info">
        <div className="seat-name">{player.name}</div>
        <div className="seat-sub">
          <span>👑 {crowned}/{player.pieces.length}</span>
          {level ? <span>{level}</span> : null}
          {team !== null && team !== undefined ? <span>{tr('Pareja {n}', { n: team + 1 })}</span> : null}
        </div>
      </div>
      <AnimatePresence>
        {bubble ? (
          <motion.div
            key={bubble.id}
            className={`bubble ${isEmote(bubble.text) ? 'emote' : ''}`}
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

/** Segundos que le quedan al jugador en turno (se ve sobre su avatar). */
function Countdown({ deadline }: { deadline: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return (
    <motion.span className={`seat-timer ${secs <= 5 ? 'hurry' : ''}`} key={secs <= 5 ? secs : 'n'} initial={secs <= 5 ? { scale: 1.5 } : false} animate={{ scale: 1 }}>
      ⏱ {secs}s
    </motion.span>
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

import { tr } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerState } from '@parques/engine';
import type { Bubble } from '../stores/gameStore';
import { Avatar } from '../components/Avatar';
import { isEmote } from './phrases';
import { Cube } from './Dice';
import type { DiceSkin } from '@parques/engine';

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
  /** Dados del rival en turno (se muestran junto a su avatar). */
  /** Últimos dados de este jugador (se ven junto a su avatar, como en el parchís). */
  dice?: [number, number] | null;
  diceSkin?: DiceSkin;
  /** Dados usados en la tirada actual (solo del jugador en turno). */
  used?: [boolean, boolean];
  rolling?: boolean;
  /** Es mi turno de tirar: mis dados laten y se tocan para tirar. */
  canRoll?: boolean;
  onRoll?: () => void;
}

const RING = 2 * Math.PI * 30;

export function PlayerSeat({ player, avatar, active, tag, frameId, level, place, crowned, deadline, totalMs, bubble, align, team, onEmote, emoteOpen, dice, diceSkin, used, rolling, canRoll, onRoll }: Props) {
  const color = `var(--${player.color})`;
  return (
    <div className={`seat ${active ? 'active' : ''} ${player.left ? 'left-game' : ''} align-${align}`} style={{ ['--pc' as string]: color }}>
      {player.left ? <span className="seat-left-tag">🚪 {tr('Se fue')}</span> : null}
      <div className="seat-avatar">
        <svg viewBox="0 0 68 68" className="seat-ring">
          <circle cx={34} cy={34} r={30} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={5} />
          {active && deadline ? <TimerRing key={deadline} deadline={deadline} totalMs={totalMs} /> : null}
        </svg>
        {active && deadline ? <Countdown deadline={deadline} /> : null}
        <div className="seat-face-wrap">
          <Avatar emoji={avatar} frameId={frameId} size={54} color={color} />
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
      {diceSkin ? (
        <SeatDice dice={dice ?? null} skin={diceSkin} active={active} used={active ? used : undefined} rolling={!!rolling && active} canRoll={!!canRoll} onRoll={onRoll} />
      ) : null}
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

/** Cajita de dados junto al avatar: muestra la última tirada; el del turno los ve rodar ahí; yo los toco para tirar. */
function SeatDice({ dice, skin, active, used, rolling, canRoll, onRoll }: { dice: [number, number] | null; skin: DiceSkin; active: boolean; used?: [boolean, boolean]; rolling: boolean; canRoll: boolean; onRoll?: () => void }) {
  const [a, b] = dice ?? [6, 5];
  return (
    <motion.button
      type="button"
      className={`seat-dicebox ${active ? 'active' : ''} ${canRoll ? 'can-roll' : ''} ${dice ? '' : 'empty'}`}
      onClick={canRoll ? onRoll : undefined}
      disabled={!canRoll}
      whileTap={canRoll ? { scale: 0.88 } : undefined}
      animate={canRoll ? { scale: [1, 1.1, 1], rotate: [0, -4, 4, 0] } : { scale: 1, rotate: 0 }}
      transition={canRoll ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
      aria-label={canRoll ? tr('Tirar los dados') : tr('Dados')}
    >
      <Cube value={a} skin={skin} size={26} rolling={rolling} used={!!dice && !!used?.[0]} />
      <Cube value={b} skin={skin} size={26} rolling={rolling} used={!!dice && !!used?.[1]} delay={0.06} />
      {canRoll ? <span className="seat-dicebox-hint">{tr('¡Tira!')}</span> : null}
    </motion.button>
  );
}

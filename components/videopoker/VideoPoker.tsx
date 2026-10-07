import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useUser } from '../../context/UserContext';
import { initialState, reducer } from '../../src/games/videopoker/reducer';
import { loadSaved, save } from '../../src/games/videopoker/storage';
import { recommendHolds } from '../../src/games/videopoker/strategy';
import { Card, HandRank, STARTING_CREDITS } from '../../src/games/videopoker/types';
import Controls from './Controls';
import CreditBar from './CreditBar';
import Hand from './Hand';
import { getTexts } from './i18n';
import PayTable from './PayTable';
import { playSound, SoundName } from './sound';
import StatsPanel from './StatsPanel';

const FLIP_DELAY_MS = 120;
const FLIP_STAGGER_MS = 80;
const BIG_WINS: HandRank[] = ['ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND'];

const Toggle: React.FC<{ icon: string; label: string; on: boolean; onClick: () => void }> = ({ icon, label, on, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    title={label}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
      on ? 'bg-primary text-white' : 'bg-surface-light dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
    }`}
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const VideoPoker: React.FC = () => {
  const { language } = useUser();
  const text = getTexts(language);
  const saved = useMemo(loadSaved, []);

  const [state, dispatch] = useReducer(reducer, saved, initialState);
  const [muted, setMuted] = useState(saved.muted ?? false);
  const [fourColor, setFourColor] = useState(saved.fourColor ?? false);
  const [showHints, setShowHints] = useState(saved.showHints ?? false);
  const [showStats, setShowStats] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  // Cartas que ya se han volteado. Una carta está boca arriba cuando coincide con la de la mano.
  const [revealed, setRevealed] = useState<(Card | undefined)[]>([]);
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const faceUp = [0, 1, 2, 3, 4].map((i) => !!state.hand[i] && revealed[i] === state.hand[i]);
  const animating = state.hand.length > 0 && faceUp.some((v) => !v);
  // Mientras una carta se voltea hacia abajo se sigue mostrando la anterior, para no adelantar la nueva.
  const shown = [0, 1, 2, 3, 4].map((i) => (faceUp[i] ? state.hand[i] : revealed[i]));

  const sound = useCallback((name: SoundName) => !muted && playSound(name), [muted]);

  // Volteo escalonado de las cartas nuevas tras Repartir/Cambiar.
  useEffect(() => {
    const pending = [0, 1, 2, 3, 4].filter((i) => state.hand[i] && revealedRef.current[i] !== state.hand[i]);
    const timers = pending.map((i, k) =>
      window.setTimeout(() => {
        setRevealed((r) => {
          const next = [...r];
          next[i] = state.hand[i];
          return next;
        });
        sound('deal');
      }, FLIP_DELAY_MS + k * FLIP_STAGGER_MS),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hand]);

  // Celebración al terminar de voltear la mano final.
  const celebrated = useRef<Card[] | null>(null);
  useEffect(() => {
    if (state.phase !== 'RESULT' || animating || celebrated.current === state.hand) return;
    celebrated.current = state.hand;
    if (state.lastWin <= 0 || !state.result) return;
    if (BIG_WINS.includes(state.result)) {
      sound('bigWin');
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ['#ea580c', '#facc15', '#ffffff'] });
    } else {
      sound('win');
    }
  }, [state.phase, state.hand, state.result, state.lastWin, animating, sound]);

  // Persistencia local.
  useEffect(() => {
    save({ credits: state.credits, bet: state.bet, stats: state.stats, muted, fourColor, showHints });
  }, [state.credits, state.bet, state.stats, muted, fourColor, showHints]);

  // Reloj de sesión (juego responsable).
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const canDeal = state.credits > 0;
  const canHold = state.phase === 'DEALT' && !animating;
  const hints = useMemo(
    () => (showHints && state.phase === 'DEALT' && !animating ? recommendHolds(state.hand) : null),
    [showHints, state.phase, state.hand, animating],
  );

  const betOne = useCallback(() => {
    if (animating || state.phase === 'DEALT' || !canDeal) return;
    sound('bet');
    dispatch({ type: 'BET_ONE' });
  }, [animating, state.phase, canDeal, sound]);

  const betMax = useCallback(() => {
    if (animating || state.phase === 'DEALT' || !canDeal) return;
    dispatch({ type: 'BET_MAX' });
  }, [animating, state.phase, canDeal]);

  const main = useCallback(() => {
    if (animating) return;
    dispatch({ type: state.phase === 'DEALT' ? 'DRAW' : 'DEAL' });
  }, [animating, state.phase]);

  const toggleHold = useCallback(
    (index: number) => {
      if (!canHold) return;
      sound('hold');
      dispatch({ type: 'TOGGLE_HOLD', index });
    },
    [canHold, sound],
  );

  // Atajos de teclado: 1–5 retener, Espacio/Enter repartir/cambiar, B apostar 1, M apuesta máx.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Sobre un botón con foco, Espacio/Enter lo activan de forma nativa.
      if ((e.key === ' ' || e.key === 'Enter') && target.closest('button')) return;

      if (e.key >= '1' && e.key <= '5') toggleHold(Number(e.key) - 1);
      else if (e.key === ' ' || e.key === 'Enter') main();
      else if (e.key.toLowerCase() === 'b') betOne();
      else if (e.key.toLowerCase() === 'm') betMax();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleHold, main, betOne, betMax]);

  let status = '';
  if (!animating) {
    if (!canDeal && state.phase !== 'DEALT') status = text.noCredits;
    else if (state.phase === 'BETTING') status = text.placeBet;
    else if (state.phase === 'DEALT') status = text.pickHolds;
    else if (state.result && state.lastWin > 0) status = text.youWin(state.lastWin, text.hands[state.result]);
    else status = text.noWin;
  }
  const showWin = state.phase === 'RESULT' && !animating;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-2xl">playing_cards</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{text.title}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{text.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Toggle icon={muted ? 'volume_off' : 'volume_up'} label={text.sound} on={!muted} onClick={() => setMuted((m) => !m)} />
          <Toggle icon="palette" label={text.fourColor} on={fourColor} onClick={() => setFourColor((v) => !v)} />
          <Toggle icon="lightbulb" label={text.hints} on={showHints} onClick={() => setShowHints((v) => !v)} />
          <Toggle icon="bar_chart" label={text.stats} on={showStats} onClick={() => setShowStats((v) => !v)} />
        </div>
      </header>

      <div className="rounded-3xl bg-gradient-to-b from-blue-900 to-blue-950 p-3 sm:p-6 shadow-2xl ring-1 ring-black/20 flex flex-col gap-4 sm:gap-5">
        <PayTable bet={state.bet} winning={showWin && state.lastWin > 0 ? state.result : null} text={text} />

        <p
          className="min-h-[1.5rem] text-center text-sm sm:text-lg font-black uppercase tracking-wide text-yellow-300"
          aria-live="polite"
          role="status"
        >
          {status}
        </p>

        <Hand
          hand={shown}
          faceUp={faceUp}
          held={state.held}
          hints={hints}
          canHold={canHold}
          fourColor={fourColor}
          text={text}
          onToggle={toggleHold}
        />

        <CreditBar win={showWin ? state.lastWin : 0} bet={state.bet} credits={state.credits} text={text} />

        {!canDeal && state.phase !== 'DEALT' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_CREDITS', amount: STARTING_CREDITS })}
            className="w-full py-3 rounded-xl font-black uppercase tracking-wide bg-primary text-white hover:bg-primary-dark shadow-lg"
          >
            {text.reload}
          </button>
        ) : (
          <Controls
            phase={state.phase}
            busy={animating}
            canDeal={canDeal}
            text={text}
            onBetOne={betOne}
            onBetMax={betMax}
            onMain={main}
          />
        )}
      </div>

      <p className="hidden sm:block text-center text-xs text-slate-500 dark:text-slate-400">{text.shortcuts}</p>

      {showStats && (
        <StatsPanel
          stats={state.stats}
          sessionSeconds={Math.floor((now - sessionStart) / 1000)}
          text={text}
          onReset={() => dispatch({ type: 'RESET_STATS' })}
        />
      )}

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
        <span className="material-symbols-outlined text-base">info</span>
        {text.disclaimer}
      </p>
    </div>
  );
};

export default VideoPoker;

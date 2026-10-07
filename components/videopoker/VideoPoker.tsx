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
import SettingsMenu from './SettingsMenu';
import { playSound, SoundName } from './sound';
import StatsPanel from './StatsPanel';

const FLIP_DELAY_MS = 120;
const FLIP_STAGGER_MS = 80;
const BIG_WINS: HandRank[] = ['ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND'];

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
      if (showStats) {
        if (e.key === 'Escape') setShowStats(false);
        return;
      }
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
  }, [toggleHold, main, betOne, betMax, showStats]);

  let status = '';
  if (!animating) {
    if (!canDeal && state.phase !== 'DEALT') status = text.noCredits;
    else if (state.phase === 'BETTING') status = text.placeBet;
    else if (state.phase === 'DEALT') status = text.pickHolds;
    else if (state.result && state.lastWin > 0) status = text.youWin(state.lastWin, text.hands[state.result]);
    else status = text.noWin;
  }
  const showWin = state.phase === 'RESULT' && !animating;

  const glow = { textShadow: '0 0 10px rgba(253,224,71,.7)' };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 py-4 sm:p-8 flex flex-col gap-3">
      {/* Mueble de la máquina: marco cromado */}
      <div
        className="rounded-[26px] p-[6px] sm:p-2 shadow-[0_25px_60px_rgba(0,0,0,.55)]"
        style={{ background: 'linear-gradient(160deg, #f4f4f5 0%, #a1a1aa 25%, #52525b 50%, #d4d4d8 75%, #3f3f46 100%)' }}
      >
        <div className="rounded-[20px] bg-gradient-to-b from-zinc-800 via-zinc-900 to-black p-2.5 sm:p-5 flex flex-col gap-3 sm:gap-4">
          {/* Marquesina */}
          <div
            className="relative z-10 rounded-xl px-4 py-2.5 sm:py-3 flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #7f1d1d 0%, #b91c1c 45%, #7f1d1d 100%)',
              boxShadow: 'inset 0 0 0 2px #fbbf24, inset 0 0 0 5px #7f1d1d, inset 0 0 0 6px #fde68a88, 0 0 20px rgba(220,38,38,.35)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-[3px] rounded-[10px] pointer-events-none animate-pulse"
              style={{ backgroundImage: 'radial-gradient(circle, #fde68a 0 1.6px, transparent 2px)', backgroundSize: '12px 12px', opacity: 0.18 }}
            />
            <div className="relative text-center leading-none">
              <h1
                className="text-xl sm:text-3xl font-black italic uppercase tracking-wider text-yellow-300"
                style={{ textShadow: '0 2px 0 #7c2d12, 0 0 14px rgba(253,224,71,.6)' }}
              >
                {text.title}
              </h1>
              <p className="mt-1 text-[9px] sm:text-xs font-bold uppercase tracking-[.3em] text-yellow-100/90">{text.subtitle}</p>
            </div>
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
              <SettingsMenu
                text={text}
                options={[
                  { icon: muted ? 'volume_off' : 'volume_up', label: text.sound, on: !muted, onClick: () => setMuted((m) => !m) },
                  { icon: 'lightbulb', label: text.hints, on: showHints, onClick: () => setShowHints((v) => !v) },
                  { icon: 'palette', label: text.fourColor, on: fourColor, onClick: () => setFourColor((v) => !v) },
                  { icon: 'bar_chart', label: text.stats, onClick: () => setShowStats(true) },
                ]}
              />
            </div>
          </div>

          {/* Pantalla */}
          <div
            className="relative rounded-xl p-2 sm:p-4 flex flex-col gap-3 sm:gap-4 overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at 50% 35%, #1638c9 0%, #0b1f8f 55%, #050f4d 100%)',
              boxShadow: 'inset 0 0 0 3px #000, inset 0 0 40px rgba(0,0,0,.65), 0 0 0 1px #52525b',
            }}
          >
            <PayTable bet={state.bet} winning={showWin && state.lastWin > 0 ? state.result : null} text={text} />

            <p
              className="min-h-[1.4rem] text-center text-sm sm:text-xl font-black uppercase tracking-wide text-yellow-300"
              style={glow}
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

            {/* Reflejo del cristal y líneas de barrido */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(155deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 35%), repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)',
              }}
            />
          </div>

          {/* Consola de botones */}
          <div className="rounded-xl bg-gradient-to-b from-zinc-700 to-zinc-900 p-2.5 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.15)]">
            {!canDeal && state.phase !== 'DEALT' ? (
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_CREDITS', amount: STARTING_CREDITS })}
                className="w-full py-3 sm:py-4 rounded-lg font-black uppercase tracking-wider text-sm text-white border-b-[5px] border-red-950 bg-gradient-to-b from-orange-300 via-red-500 to-red-700 active:border-b-[1px] active:translate-y-[4px]"
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
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">{text.disclaimer}</p>

      {showStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowStats(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={text.stats}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowStats(false)}
              aria-label={text.close}
              className="absolute right-3 top-3 z-10 p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <StatsPanel
              stats={state.stats}
              sessionSeconds={Math.floor((now - sessionStart) / 1000)}
              text={text}
              onReset={() => dispatch({ type: 'RESET_STATS' })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPoker;

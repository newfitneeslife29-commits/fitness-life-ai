import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useUser } from '../../context/UserContext';
import { initialState, reducer } from '../../src/games/videopoker/reducer';
import { loadSaved, save } from '../../src/games/videopoker/storage';
import { recommendHolds } from '../../src/games/videopoker/strategy';
import { Card, HandRank, STARTING_CREDITS } from '../../src/games/videopoker/types';
import BetChips from './BetChips';
import Deck from './Deck';
import Hand from './Hand';
import { getTexts } from './i18n';
import PayTable from './PayTable';
import SettingsMenu from './SettingsMenu';
import { playSound, SoundName } from './sound';
import StatsPanel from './StatsPanel';

const DEAL_DELAY_MS = 120; // antes de la primera carta cuando la mesa está vacía
const RETURN_DELAY_MS = 500; // tiempo para que las cartas descartadas vuelvan al mazo
const DEAL_STAGGER_MS = 110;
const NO_HOLDS = [false, false, false, false, false];
const BIG_WINS: HandRank[] = ['ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND'];

const VideoPoker: React.FC = () => {
  const { language } = useUser();
  const text = getTexts(language);
  const saved = useMemo(loadSaved, []);

  const [state, dispatch] = useReducer(reducer, saved, initialState);
  const [muted, setMuted] = useState(saved.muted ?? false);
  const [fourColor, setFourColor] = useState(saved.fourColor ?? false);
  const [showHints, setShowHints] = useState(saved.showHints ?? false);
  const [sheet, setSheet] = useState<'paytable' | 'stats' | null>(null);
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
    // Si había cartas en la mesa, primero vuelven al mazo y después salen las nuevas.
    const delay = pending.some((i) => revealedRef.current[i]) ? RETURN_DELAY_MS : DEAL_DELAY_MS;
    const timers = pending.map((i, k) =>
      window.setTimeout(() => {
        setRevealed((r) => {
          const next = [...r];
          next[i] = state.hand[i];
          return next;
        });
        sound('deal');
      }, delay + k * DEAL_STAGGER_MS),
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
      try {
        navigator.vibrate?.(8); // respuesta háptica en móviles
      } catch {
        // sin vibración
      }
      dispatch({ type: 'TOGGLE_HOLD', index });
    },
    [canHold, sound],
  );

  // Atajos de teclado: 1–5 retener, Espacio/Enter repartir/cambiar, B apostar 1, M apuesta máx.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet) {
        if (e.key === 'Escape') setSheet(null);
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
  }, [toggleHold, main, betOne, betMax, sheet]);

  const noCredits = !canDeal && state.phase !== 'DEALT';
  const showWin = state.phase === 'RESULT' && !animating;
  const won = showWin && state.lastWin > 0 && state.result;

  let message: React.ReactNode = null;
  if (!animating) {
    if (noCredits) message = <span className="text-amber-100/80">{text.noCredits}</span>;
    else if (state.phase === 'BETTING') message = <span className="text-amber-100/80">{text.placeBet}</span>;
    else if (state.phase === 'DEALT')
      message = (
        <span className="text-amber-100/80">
          {text.pickHolds}
          <span className="block text-[11px] sm:text-xs text-amber-100/50 font-semibold normal-case tracking-normal">{text.drawHint}</span>
        </span>
      );
    else if (won)
      message = (
        <span className="flex flex-col items-center leading-tight">
          <span className="text-xl sm:text-3xl text-amber-300" style={{ fontFamily: 'Georgia, serif', textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>
            {text.hands[state.result as HandRank]}
          </span>
          <span className="text-sm sm:text-base text-amber-100">+{state.lastWin}</span>
        </span>
      );
    else message = <span className="text-amber-100/60">{text.noWin}</span>;
  }

  const announce = won ? text.youWin(state.lastWin, text.hands[state.result as HandRank]) : '';

  return (
    <div
      className="relative flex-1 w-full min-h-[calc(100dvh-4.5rem)] md:min-h-screen flex flex-col select-none overflow-hidden"
      style={{
        // Tapete de fieltro verde con textura sutil
        backgroundColor: '#0f5132',
        backgroundImage:
          'radial-gradient(ellipse at 50% 40%, rgba(46,160,96,.55) 0%, rgba(15,81,50,0) 65%), radial-gradient(ellipse at 50% 120%, rgba(0,0,0,.45), transparent 60%), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .35 0\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        boxShadow: 'inset 0 0 120px rgba(0,0,0,.55)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Barra superior mínima */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="flex flex-col leading-none">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[.2em] text-amber-100/60">{text.credits}</span>
          <span className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-white" style={{ textShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
            {state.credits}
          </span>
        </div>
        <SettingsMenu
          text={text}
          options={[
            { icon: 'table_rows', label: text.paytable, onClick: () => setSheet('paytable') },
            { icon: 'lightbulb', label: text.hints, on: showHints, onClick: () => setShowHints((v) => !v) },
            { icon: muted ? 'volume_off' : 'volume_up', label: text.sound, on: !muted, onClick: () => setMuted((m) => !m) },
            { icon: 'palette', label: text.fourColor, on: fourColor, onClick: () => setFourColor((v) => !v) },
            { icon: 'bar_chart', label: text.stats, onClick: () => setSheet('stats') },
          ]}
        />
      </div>

      {/* Mesa: mazo, mensaje y mano. Las medidas salen del ancho disponible. */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 pb-6" style={{ containerType: 'inline-size' }}>
        <div
          className="w-full flex flex-col items-center"
          style={
            {
              '--cw': 'min(18cqw, 150px)',
              '--gap': 'min(1.8cqw, 18px)',
              '--dy': 'clamp(4.5rem, 12cqw, 7rem)',
            } as React.CSSProperties
          }
        >
          <Deck
            label={state.phase === 'DEALT' ? text.deckDraw : text.deckDeal}
            active={!animating && !noCredits}
            onClick={main}
          />

          <div
            className="flex items-center justify-center text-center px-2 font-black uppercase tracking-wide text-sm sm:text-lg"
            style={{ height: 'var(--dy)' }}
          >
            {message}
            {noCredits && !animating && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_CREDITS', amount: STARTING_CREDITS })}
                className="ml-3 px-4 py-2 rounded-full bg-amber-300 text-amber-950 text-xs sm:text-sm font-black uppercase shadow-lg active:scale-95"
              >
                {text.reloadShort}
              </button>
            )}
          </div>

          <Hand
            hand={shown}
            dealt={state.hand.length > 0}
            faceUp={faceUp}
            held={state.phase === 'DEALT' ? state.held : NO_HOLDS}
            hints={hints}
            canHold={canHold}
            fourColor={fourColor}
            text={text}
            onToggle={toggleHold}
          />

          {/* Fichas apostadas */}
          <div className="mt-12 sm:mt-14 flex items-center gap-3">
            <BetChips
              bet={state.bet}
              label={text.chips(state.bet)}
              disabled={animating || state.phase === 'DEALT' || noCredits}
              onClick={betOne}
            />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[.2em] text-amber-100/60">
              {text.bet} {state.bet}
            </span>
          </div>
        </div>
      </div>

      {/* Leyenda impresa en el tapete */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 sm:bottom-5 inset-x-0 text-center text-[10px] sm:text-xs uppercase tracking-[.35em] text-amber-200/25"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {text.subtitle} · {text.feltNote}
      </p>

      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === 'stats' ? text.stats : text.paytable}
            className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSheet(null)}
              aria-label={text.close}
              className="absolute right-3 top-3 z-10 p-1.5 rounded-full text-slate-400 hover:bg-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            {sheet === 'stats' ? (
              <StatsPanel
                stats={state.stats}
                sessionSeconds={Math.floor((now - sessionStart) / 1000)}
                text={text}
                onReset={() => dispatch({ type: 'RESET_STATS' })}
              />
            ) : (
              <section className="rounded-t-2xl sm:rounded-2xl bg-zinc-900 p-4 sm:p-6 flex flex-col gap-3">
                <h2 className="text-lg font-black text-white">{text.paytable}</h2>
                <p className="text-xs text-zinc-400">{text.subtitle}</p>
                <PayTable bet={state.bet} winning={won ? state.result : null} text={text} />
                <p className="text-[11px] text-zinc-500">{text.disclaimer}</p>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPoker;

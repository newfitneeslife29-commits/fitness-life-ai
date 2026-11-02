import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useUser } from '../../context/UserContext';
import { initialState, reducer } from '../../src/games/videopoker/reducer';
import { loadSaved, save } from '../../src/games/videopoker/storage';
import { recommendHolds } from '../../src/games/videopoker/strategy';
import { Card, HandRank, MAX_BET, STARTING_CREDITS } from '../../src/games/videopoker/types';
import Hand from './Hand';
import { getTexts } from './i18n';
import MachineButton from './MachineButton';
import PayTable from './PayTable';
import SettingsMenu from './SettingsMenu';
import { playSound, SoundName } from './sound';
import StatsPanel from './StatsPanel';

const NO_HOLDS = [false, false, false, false, false];
const BIG_WINS: HandRank[] = ['ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND'];
const TIMING = {
  normal: { flip: 260, stagger: 120, first: 80 },
  fast: { flip: 140, stagger: 45, first: 40 },
};

const FONT = '"Roboto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
const ORANGE = '#ff8a1f';
// Letras naranjas con contorno oscuro, como los rótulos de la máquina.
const orangeText: React.CSSProperties = {
  color: ORANGE,
  WebkitTextStroke: '1px #6b1300',
  paintOrder: 'stroke fill',
  textShadow: '0 2px 0 #000',
};

/** Hace subir el número poco a poco cuando aumenta (efecto de conteo de premio). */
function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    const from = valueRef.current;
    if (target <= from) {
      setValue(target);
      return;
    }
    const duration = Math.min(1500, 25 * (target - from) + 200);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setValue(Math.round(from + (target - from) * k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

const VideoPoker: React.FC = () => {
  const { language } = useUser();
  const text = getTexts(language);
  const saved = useMemo(loadSaved, []);

  const [state, dispatch] = useReducer(reducer, saved, initialState);
  const [muted, setMuted] = useState(saved.muted ?? false);
  const [fourColor, setFourColor] = useState(saved.fourColor ?? false);
  const [showHints, setShowHints] = useState(saved.showHints ?? false);
  const [fast, setFast] = useState(saved.fast ?? false);
  const [sheet, setSheet] = useState<'info' | null>(null);
  const [sessionStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const timing = fast ? TIMING.fast : TIMING.normal;

  // Cartas ya volteadas. Una carta está boca arriba cuando coincide con la de la mano.
  const [revealed, setRevealed] = useState<(Card | undefined)[]>([]);
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const faceUp = [0, 1, 2, 3, 4].map((i) => !!state.hand[i] && revealed[i] === state.hand[i]);
  const animating = state.hand.length > 0 && faceUp.some((v) => !v);
  // Mientras una carta se voltea hacia abajo se sigue mostrando la anterior, para no adelantar la nueva.
  const shown = [0, 1, 2, 3, 4].map((i) => (faceUp[i] ? state.hand[i] : revealed[i]));

  const sound = useCallback((name: SoundName) => !muted && playSound(name), [muted]);

  // Volteo escalonado: las descartadas se ponen boca abajo y luego salen las nuevas.
  useEffect(() => {
    const pending = [0, 1, 2, 3, 4].filter((i) => state.hand[i] && revealedRef.current[i] !== state.hand[i]);
    const delay = pending.some((i) => revealedRef.current[i]) ? timing.flip + 40 : timing.first;
    const timers = pending.map((i, k) =>
      window.setTimeout(() => {
        setRevealed((r) => {
          const next = [...r];
          next[i] = state.hand[i];
          return next;
        });
        sound('deal');
      }, delay + k * timing.stagger),
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
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ['#f8ec4f', '#ff8a1f', '#ffffff'] });
    } else {
      sound('win');
    }
  }, [state.phase, state.hand, state.result, state.lastWin, animating, sound]);

  useEffect(() => {
    save({ credits: state.credits, bet: state.bet, stats: state.stats, muted, fourColor, showHints, fast });
  }, [state.credits, state.bet, state.stats, muted, fourColor, showHints, fast]);

  // Reloj de sesión (juego responsable).
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const canDeal = state.credits > 0;
  const canHold = state.phase === 'DEALT' && !animating;
  const noCredits = !canDeal && state.phase !== 'DEALT';
  const showWin = state.phase === 'RESULT' && !animating;
  const won = showWin && state.lastWin > 0 && state.result ? state.result : null;
  const hints = useMemo(
    () => (showHints && state.phase === 'DEALT' && !animating ? recommendHolds(state.hand) : null),
    [showHints, state.phase, state.hand, animating],
  );

  // El premio se suma al marcador con conteo; mientras las cartas giran se muestra el saldo anterior.
  const shownCredits = useCountUp(animating && state.phase === 'RESULT' ? state.credits - state.lastWin : state.credits);
  const shownWin = useCountUp(won ? state.lastWin : 0);

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

  // Texto de estado de la esquina inferior, como en la máquina.
  let status = '';
  if (!animating) {
    if (noCredits) status = text.insertCredits;
    else if (state.phase === 'DEALT') status = text.holdPrompt;
    else status = text.gameOver;
  }
  const bettingIdle = state.phase !== 'DEALT' && !animating && !noCredits;
  const betDisabled = !bettingIdle;

  return (
    <div
      className="relative flex-1 w-full min-h-[calc(100dvh-4.5rem)] md:min-h-screen flex flex-col select-none"
      style={{
        fontFamily: FONT,
        background: 'linear-gradient(180deg, #3f86e0 0%, #2456b8 22%, #13307a 48%, #07123a 72%, #000 100%)',
        containerType: 'inline-size',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`@keyframes vp-blink{0%,49%{opacity:1}50%,100%{opacity:.25}}.vp-blink{animation:vp-blink .8s steps(1) infinite}`}</style>

      <div className="w-full max-w-[1200px] mx-auto flex-1 flex flex-col px-[2cqw] pt-[1.5cqw] pb-2 gap-[0.8cqw]">
        <PayTable bet={state.bet} winning={won} text={text} />

        {/* Nombre de la mano ganadora */}
        <div className="flex items-center justify-center" style={{ height: 'clamp(26px, 4cqw, 46px)' }}>
          {won && (
            <span className="font-black uppercase tracking-wide leading-none" style={{ ...orangeText, fontSize: 'clamp(20px, 3.8cqw, 44px)' }}>
              {text.hands[won]}
            </span>
          )}
        </div>

        {/* Cartas, con el aviso "Juega 5 créditos" encima en reposo */}
        <div className="relative">
          <Hand
            hand={shown}
            faceUp={faceUp}
            held={state.phase === 'DEALT' ? state.held : NO_HOLDS}
            hints={hints}
            canHold={canHold}
            fourColor={fourColor}
            flipMs={timing.flip}
            text={text}
            onToggle={toggleHold}
          />
          {bettingIdle && !won && state.bet < MAX_BET && (
            <div className="pointer-events-none absolute inset-x-0 top-[58%] flex justify-center">
              <span
                className="px-[1.2cqw] py-[0.3cqw] font-black uppercase leading-none"
                style={{ ...orangeText, fontSize: 'clamp(18px, 4.4cqw, 52px)', background: 'rgba(10,18,60,.92)' }}
              >
                {text.play5}
              </span>
            </div>
          )}
        </div>

        {/* Marcadores, botonera y pie: abajo, al alcance del pulgar */}
        <div className="mt-auto flex flex-col gap-[0.8cqw]">
        <div className="grid grid-cols-3 items-end font-black uppercase leading-none mt-[0.6cqw]" style={{ fontSize: 'clamp(15px, 2.6cqw, 30px)' }}>
          <span style={orangeText} className="justify-self-start tabular-nums">
            {shownWin > 0 ? `${text.win} ${shownWin}` : ''}
          </span>
          <span className="justify-self-center text-white" style={{ textShadow: '0 2px 0 #000', fontSize: '0.75em' }}>
            {text.bet} {state.bet}
          </span>
          <span style={orangeText} className="justify-self-end tabular-nums whitespace-nowrap">
            {text.credits} {shownCredits}
          </span>
        </div>

        {/* Botonera */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-[clamp(6px,1.2cqw,14px)]">
          <MachineButton onClick={() => setSheet('info')}>{text.gameInfo}</MachineButton>
          <SettingsMenu
            text={text}
            up
            options={[
              { icon: 'lightbulb', label: text.hints, on: showHints, onClick: () => setShowHints((v) => !v) },
              { icon: muted ? 'volume_off' : 'volume_up', label: text.sound, on: !muted, onClick: () => setMuted((m) => !m) },
              { icon: 'palette', label: text.fourColor, on: fourColor, onClick: () => setFourColor((v) => !v) },
            ]}
            renderTrigger={({ open, toggle }) => (
              <MachineButton className="w-full" onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                {text.options}
              </MachineButton>
            )}
          />
          <MachineButton onClick={() => setFast((v) => !v)} aria-pressed={fast} aria-label={`${text.speed}: ${fast ? '2' : '1'}`}>
            {text.speed}
            <span className="font-black tracking-[-0.25em]" aria-hidden="true">
              {fast ? '❯❯❯' : '❯❯'}
            </span>
          </MachineButton>
          <MachineButton onClick={betOne} disabled={betDisabled}>
            {text.betOne}
          </MachineButton>
          <MachineButton onClick={betMax} disabled={betDisabled}>
            {text.betMax}
          </MachineButton>
          {noCredits ? (
            <MachineButton onClick={() => dispatch({ type: 'ADD_CREDITS', amount: STARTING_CREDITS })}>{text.reloadShort}</MachineButton>
          ) : (
            <MachineButton onClick={main} disabled={animating}>
              {state.phase === 'DEALT' ? text.draw : text.deal}
            </MachineButton>
          )}
        </div>

        {/* Pie: nombre del juego y estado */}
        <div className="flex items-center justify-between font-bold uppercase text-white/90 leading-none" style={{ fontSize: 'clamp(10px, 1.4cqw, 16px)' }}>
          <span>{text.subtitle}</span>
          <span aria-live="polite" role="status">
            {won ? text.youWin(state.lastWin, text.hands[won]) : status}
          </span>
        </div>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={text.stats}
            className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ fontFamily: 'Lexend, sans-serif' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSheet(null)}
              aria-label={text.close}
              className="absolute right-3 top-3 z-10 p-1.5 rounded-full text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <StatsPanel
              stats={state.stats}
              sessionSeconds={Math.floor((now - sessionStart) / 1000)}
              text={text}
              onReset={() => dispatch({ type: 'RESET_STATS' })}
            />
            <div className="bg-white dark:bg-surface-dark px-4 sm:px-6 pb-5 -mt-3 rounded-b-2xl text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-2">
              <p className="hidden sm:block">{text.shortcuts}</p>
              <p>{text.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPoker;

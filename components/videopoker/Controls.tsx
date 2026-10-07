import React from 'react';
import { Phase } from '../../src/games/videopoker/types';
import { Texts } from './i18n';

interface Props {
  phase: Phase;
  busy: boolean;
  canDeal: boolean;
  text: Texts;
  onBetOne: () => void;
  onBetMax: () => void;
  onMain: () => void;
}

// Botones físicos de máquina: biselados, iluminados y con recorrido al pulsarlos.
const base =
  'relative rounded-lg py-3 sm:py-4 font-black uppercase tracking-wider text-[11px] sm:text-sm border-b-[5px] transition-all duration-75 ' +
  'enabled:active:border-b-[1px] enabled:active:translate-y-[4px] disabled:opacity-35 disabled:saturate-50 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70';
const yellow = `${base} bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-600 border-yellow-800 text-yellow-950`;
const red = `${base} bg-gradient-to-b from-orange-300 via-red-500 to-red-700 border-red-950 text-white`;
const lit = { boxShadow: 'inset 0 2px 0 rgba(255,255,255,.6), 0 0 14px rgba(255,200,80,.25), 0 6px 10px rgba(0,0,0,.6)' };
const litRed = { boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5), 0 0 18px rgba(239,68,68,.45), 0 6px 10px rgba(0,0,0,.6)' };

const Controls: React.FC<Props> = ({ phase, busy, canDeal, text, onBetOne, onBetMax, onMain }) => {
  const betting = phase !== 'DEALT';
  const betDisabled = !betting || busy || !canDeal;
  return (
    <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2 sm:gap-4">
      <button type="button" className={yellow} style={lit} onClick={onBetOne} disabled={betDisabled}>
        {text.betOne}
      </button>
      <button type="button" className={yellow} style={lit} onClick={onBetMax} disabled={betDisabled}>
        {text.betMax}
      </button>
      <button type="button" className={red} style={litRed} onClick={onMain} disabled={busy || (betting && !canDeal)}>
        {betting ? text.deal : text.draw}
      </button>
    </div>
  );
};

export default Controls;

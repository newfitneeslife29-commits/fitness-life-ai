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

const btn =
  'px-2.5 sm:px-5 py-3 rounded-xl font-black uppercase tracking-wide text-xs sm:text-sm shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300';

const Controls: React.FC<Props> = ({ phase, busy, canDeal, text, onBetOne, onBetMax, onMain }) => {
  const betting = phase !== 'DEALT';
  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
      <div className="flex gap-1.5 sm:gap-2">
        <button type="button" className={`${btn} bg-yellow-400 text-blue-950 hover:bg-yellow-300`} onClick={onBetOne} disabled={!betting || busy || !canDeal}>
          {text.betOne}
        </button>
        <button type="button" className={`${btn} bg-yellow-400 text-blue-950 hover:bg-yellow-300`} onClick={onBetMax} disabled={!betting || busy || !canDeal}>
          {text.betMax}
        </button>
      </div>
      <button
        type="button"
        className={`${btn} min-w-[84px] sm:min-w-[160px] bg-primary text-white hover:bg-primary-dark shadow-primary/30`}
        onClick={onMain}
        disabled={busy || (betting && !canDeal)}
      >
        {betting ? text.deal : text.draw}
      </button>
    </div>
  );
};

export default Controls;

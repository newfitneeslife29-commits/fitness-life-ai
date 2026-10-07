import React from 'react';
import { Card } from '../../src/games/videopoker/types';
import { Texts } from './i18n';

const SUIT_SYMBOL: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

function suitColor(suit: Card['suit'], fourColor: boolean): string {
  if (fourColor) return { S: 'text-slate-900', H: 'text-red-600', D: 'text-blue-600', C: 'text-green-700' }[suit];
  return suit === 'H' || suit === 'D' ? 'text-red-600' : 'text-slate-900';
}

interface Props {
  card?: Card;
  faceUp: boolean;
  held: boolean;
  hinted: boolean;
  disabled: boolean;
  fourColor: boolean;
  index: number;
  text: Texts;
  onToggle: () => void;
}

const CardView: React.FC<Props> = ({ card, faceUp, held, hinted, disabled, fourColor, index, text, onToggle }) => {
  const label =
    card && faceUp
      ? `${text.ranks[card.rank]} ${text.of} ${text.suits[card.suit]}${held ? `, ${text.held.toLowerCase()}` : ''}`
      : text.faceDown;
  const rank = card ? RANK_LABEL[card.rank] ?? String(card.rank) : '';
  const color = card ? suitColor(card.suit, fourColor) : '';

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0 max-w-[120px]">
      <span
        className={`h-6 text-[9px] sm:text-sm font-black uppercase sm:tracking-widest ${held ? 'text-yellow-300' : hinted ? 'text-sky-300' : 'text-transparent'}`}
        aria-hidden="true"
      >
        {held ? text.held : hinted ? text.hint : '·'}
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={held}
        aria-label={`${index + 1}: ${label}`}
        className={`relative w-full aspect-[5/7] rounded-lg sm:rounded-xl transition-transform duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 ${
          held ? '-translate-y-2' : ''
        } ${disabled ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1'}`}
        style={{ perspective: '800px' }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transformStyle: 'preserve-3d', transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
        >
          {/* Frente */}
          <div
            className={`absolute inset-0 rounded-lg sm:rounded-xl bg-white shadow-lg flex flex-col p-1 sm:p-2 ${color} ${
              held ? 'ring-4 ring-yellow-300' : hinted ? 'ring-4 ring-sky-400' : 'ring-1 ring-black/10'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {card && (
              <>
                <div className="flex flex-col items-start leading-none font-black text-base sm:text-2xl">
                  <span>{rank}</span>
                  <span className="text-sm sm:text-xl">{SUIT_SYMBOL[card.suit]}</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-3xl sm:text-5xl">{SUIT_SYMBOL[card.suit]}</div>
              </>
            )}
          </div>
          {/* Dorso */}
          <div
            className="absolute inset-0 rounded-lg sm:rounded-xl shadow-lg ring-2 ring-white/80 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-1.5 sm:inset-2 rounded-md border-2 border-white/40 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0_6px,transparent_6px_12px)]" />
            <span className="relative font-black text-white text-sm sm:text-xl tracking-tight">FIT</span>
          </div>
        </div>
      </button>
    </div>
  );
};

export default CardView;

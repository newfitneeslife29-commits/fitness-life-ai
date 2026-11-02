import React from 'react';
import { Card } from '../../src/games/videopoker/types';
import { CourtArt } from './CourtArt';
import { Texts } from './i18n';

const SUIT_SYMBOL: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

function suitColor(suit: Card['suit'], fourColor: boolean): string {
  if (fourColor) return { S: '#111', H: '#e02b1a', D: '#1d4ed8', C: '#15803d' }[suit];
  return suit === 'H' || suit === 'D' ? '#e02b1a' : '#111';
}

/** Cara de la carta al estilo de las máquinas clásicas: índice grande, palo y figura. */
const CardFace: React.FC<{ card: Card; fourColor: boolean }> = ({ card, fourColor }) => {
  const suit = SUIT_SYMBOL[card.suit];
  const rank = RANK_LABEL[card.rank] ?? String(card.rank);
  const color = suitColor(card.suit, fourColor);
  const hasArt = card.rank >= 11;

  return (
    <div className="absolute inset-0 select-none" style={{ color }}>
      <span
        className="absolute leading-none"
        style={{
          left: rank === '10' ? '4%' : '8%',
          top: '5%',
          fontFamily: RANK_FONT,
          fontWeight: 900,
          fontSize: rank === '10' ? '27cqw' : '31cqw',
          letterSpacing: rank === '10' ? '-0.06em' : undefined,
        }}
      >
        {rank}
      </span>
      <span className="absolute leading-none" style={{ left: '7%', top: '30%', fontSize: '29cqw' }}>
        {suit}
      </span>
      {hasArt && (
        <div className="absolute" style={{ right: '4%', top: '4%', width: '54%', height: '42%' }}>
          <CourtArt card={card} suit={suit} color={color} />
        </div>
      )}
      <span
        className="absolute leading-none"
        style={{ left: '50%', bottom: '6%', transform: 'translateX(-50%)', fontSize: '68cqw', filter: 'drop-shadow(0 1px 0 rgba(0,0,0,.15))' }}
      >
        {suit}
      </span>
    </div>
  );
};

/** Dorso clásico de máquina. */
const CardBack: React.FC = () => (
  <div className="absolute inset-0 rounded-[6%/4.5%] overflow-hidden" style={{ background: '#fffef4', boxShadow: 'inset 0 0 0 2px #e6df9c' }}>
    <div
      className="absolute rounded-[4%/3%]"
      style={{
        inset: '6%',
        backgroundColor: '#1e3a8a',
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(255,255,255,.18) 0 18%, transparent 19%), repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgba(255,255,255,.18) 0 2px, transparent 2px 9px)',
        backgroundSize: '100% 100%, auto, auto',
        boxShadow: 'inset 0 0 0 2px #0f1f4d, inset 0 0 0 4px rgba(255,255,255,.4)',
      }}
    />
  </div>
);

interface Props {
  card?: Card;
  faceUp: boolean;
  held: boolean;
  hinted: boolean;
  disabled: boolean;
  fourColor: boolean;
  flipMs: number;
  index: number;
  text: Texts;
  onToggle: () => void;
}

const CardView: React.FC<Props> = ({ card, faceUp, held, hinted, disabled, fourColor, flipMs, index, text, onToggle }) => {
  const label =
    card && faceUp
      ? `${text.ranks[card.rank]} ${text.of} ${text.suits[card.suit]}${held ? `, ${text.held.toLowerCase()}` : ''}`
      : text.faceDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={held}
      aria-label={`${index + 1}: ${label}`}
      className="relative w-full aspect-[5/7] rounded-[6%/4.5%] focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 disabled:cursor-default"
      style={{ perspective: '1000px', containerType: 'inline-size', WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
          transition: `transform ${flipMs}ms ease-out`,
        }}
      >
        <div
          className="absolute inset-0 rounded-[6%/4.5%] overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(170deg, #ffffff 0%, #fffdf3 60%, #f6f1d8 100%)',
            boxShadow: hinted
              ? 'inset 0 0 0 2px #e6df9c, 0 0 0 3px #22d3ee, 0 6px 12px rgba(0,0,0,.45)'
              : 'inset 0 0 0 2px #e6df9c, 0 6px 12px rgba(0,0,0,.45)',
          }}
        >
          {card && <CardFace card={card} fourColor={fourColor} />}
        </div>
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 6px 12px rgba(0,0,0,.45)', borderRadius: '6%/4.5%' }}>
          <CardBack />
        </div>
      </div>
    </button>
  );
};

export default CardView;

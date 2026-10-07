import React from 'react';
import { Card } from '../../src/games/videopoker/types';
import { Texts } from './i18n';

const SUIT_SYMBOL: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

// Posición de los símbolos (x %, y %) en las cartas numéricas, como en una baraja real.
const PIPS: Record<number, [number, number][]> = {
  2: [[50, 20], [50, 80]],
  3: [[50, 20], [50, 50], [50, 80]],
  4: [[32, 20], [68, 20], [32, 80], [68, 80]],
  5: [[32, 20], [68, 20], [50, 50], [32, 80], [68, 80]],
  6: [[32, 20], [68, 20], [32, 50], [68, 50], [32, 80], [68, 80]],
  7: [[32, 20], [68, 20], [50, 35], [32, 50], [68, 50], [32, 80], [68, 80]],
  8: [[32, 20], [68, 20], [50, 35], [32, 50], [68, 50], [50, 65], [32, 80], [68, 80]],
  9: [[32, 20], [68, 20], [32, 40], [68, 40], [50, 50], [32, 60], [68, 60], [32, 80], [68, 80]],
  10: [[32, 20], [68, 20], [50, 30], [32, 40], [68, 40], [32, 60], [68, 60], [50, 70], [32, 80], [68, 80]],
};

function suitColor(suit: Card['suit'], fourColor: boolean): string {
  if (fourColor) return { S: '#111827', H: '#c8102e', D: '#1d4ed8', C: '#15803d' }[suit];
  return suit === 'H' || suit === 'D' ? '#c8102e' : '#111827';
}

const Corner: React.FC<{ rank: string; suit: string; flip?: boolean }> = ({ rank, suit, flip }) => (
  <div
    className="absolute flex flex-col items-center leading-none font-bold"
    style={{
      ...SERIF,
      left: flip ? undefined : '5%',
      top: flip ? undefined : '4%',
      right: flip ? '5%' : undefined,
      bottom: flip ? '4%' : undefined,
      transform: flip ? 'rotate(180deg)' : undefined,
    }}
  >
    <span style={{ fontSize: '19cqw', letterSpacing: rank === '10' ? '-0.12em' : undefined }}>{rank}</span>
    <span style={{ fontSize: '15cqw', marginTop: '1cqw' }}>{suit}</span>
  </div>
);

const CardFace: React.FC<{ card: Card; fourColor: boolean }> = ({ card, fourColor }) => {
  const suit = SUIT_SYMBOL[card.suit];
  const rank = RANK_LABEL[card.rank] ?? String(card.rank);
  const color = suitColor(card.suit, fourColor);

  let center: React.ReactNode;
  if (card.rank === 14) {
    center = (
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: card.suit === 'S' ? '62cqw' : '48cqw' }}>
        {suit}
      </div>
    );
  } else if (card.rank >= 11) {
    // Figuras: marco decorado con la letra grande.
    center = (
      <div
        className="absolute rounded-[4cqw] flex flex-col items-center justify-center"
        style={{
          inset: '14% 25%',
          border: `1.2cqw solid ${color}`,
          boxShadow: `inset 0 0 0 1.6cqw #fff, inset 0 0 0 2.2cqw ${color}55`,
          background: 'linear-gradient(160deg, #fff8e1 0%, #fde68a 55%, #fbbf24 100%)',
        }}
      >
        <span style={{ ...SERIF, fontSize: '34cqw', fontWeight: 700, lineHeight: 1, textShadow: '0 1px 0 #fff' }}>{rank}</span>
        <span style={{ fontSize: '16cqw', lineHeight: 1 }}>{suit}</span>
      </div>
    );
  } else {
    center = PIPS[card.rank].map(([x, y], i) => (
      <span
        key={i}
        className="absolute leading-none"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          fontSize: card.rank >= 9 ? '19cqw' : '22cqw',
          transform: `translate(-50%, -50%)${y > 50 ? ' rotate(180deg)' : ''}`,
        }}
      >
        {suit}
      </span>
    ));
  }

  return (
    <div className="absolute inset-0 select-none" style={{ color }}>
      <Corner rank={rank} suit={suit} />
      <Corner rank={rank} suit={suit} flip />
      {center}
    </div>
  );
};

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

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 max-w-[124px]">
      <span
        className={`h-5 sm:h-6 text-[10px] sm:text-sm font-black uppercase sm:tracking-widest ${
          held ? 'text-yellow-300' : hinted ? 'text-cyan-300' : 'text-transparent'
        }`}
        style={held ? { textShadow: '0 0 8px rgba(253,224,71,.8)' } : undefined}
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
        className={`relative w-full aspect-[5/7] rounded-[7%/5%] transition-transform duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 ${
          disabled ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{ perspective: '900px', containerType: 'inline-size' }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transformStyle: 'preserve-3d', transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 rounded-[7%/5%] overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f6f0 60%, #ece8dc 100%)',
              boxShadow: held
                ? '0 0 0 3px #fde047, 0 0 18px rgba(253,224,71,.55), 0 6px 14px rgba(0,0,0,.5)'
                : hinted
                  ? '0 0 0 3px #22d3ee, 0 6px 14px rgba(0,0,0,.5)'
                  : 'inset 0 0 0 1px rgba(0,0,0,.12), 0 6px 14px rgba(0,0,0,.5)',
            }}
          >
            {card && <CardFace card={card} fourColor={fourColor} />}
          </div>
          {/* Dorso */}
          <div
            className="absolute inset-0 rounded-[7%/5%] overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#fff',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15), 0 6px 14px rgba(0,0,0,.5)',
            }}
          >
            <div
              className="absolute rounded-[5%/3.5%]"
              style={{
                inset: '6%',
                backgroundColor: '#b91c1c',
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(255,255,255,.22) 0 1.5px, transparent 1.5px 9px)',
                boxShadow: 'inset 0 0 0 2px #7f1d1d, inset 0 0 0 4px rgba(255,255,255,.35)',
              }}
            />
          </div>
        </div>
      </button>
    </div>
  );
};

export default CardView;

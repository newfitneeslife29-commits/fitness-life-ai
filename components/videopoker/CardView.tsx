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

/** Dorso clásico: rombos rojos con borde blanco. */
export const CardBack: React.FC = () => (
  <div
    className="absolute inset-0 rounded-[7%/5%] overflow-hidden"
    style={{ background: '#fbfaf7', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.18)' }}
  >
    <div
      className="absolute rounded-[5%/3.5%]"
      style={{
        inset: '6%',
        backgroundColor: '#a51c24',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 1.5px, transparent 1.5px 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,.2) 0 1.5px, transparent 1.5px 8px)',
        boxShadow: 'inset 0 0 0 2px #6b0f14, inset 0 0 0 4px rgba(255,255,255,.35)',
      }}
    />
  </div>
);

// Tamaño de carta compartido con el mazo (ver VideoPoker): --cw ancho, --gap separación, --dy distancia al mazo.
const CARD_SIZE: React.CSSProperties = { width: 'var(--cw)', height: 'calc(var(--cw) * 1.4)' };

interface Props {
  card?: Card;
  faceUp: boolean;
  atDeck: boolean;
  held: boolean;
  hinted: boolean;
  disabled: boolean;
  fourColor: boolean;
  index: number;
  text: Texts;
  onToggle: () => void;
}

const CardView: React.FC<Props> = ({ card, faceUp, atDeck, held, hinted, disabled, fourColor, index, text, onToggle }) => {
  const label =
    card && faceUp
      ? `${text.ranks[card.rank]} ${text.of} ${text.suits[card.suit]}${held ? `, ${text.held.toLowerCase()}` : ''}`
      : text.faceDown;

  // En el mazo la carta se apila sobre él; en su sitio, sube un poco si está retenida.
  const transform = atDeck
    ? `translate(calc(${2 - index} * (var(--cw) + var(--gap))), calc(-1 * (var(--cw) * 1.4 + var(--dy)))) rotate(${(index - 2) * 2}deg)`
    : held
      ? 'translateY(-12%)'
      : 'none';

  return (
    <div className="relative" style={CARD_SIZE}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={held}
        aria-label={`${index + 1}: ${label}`}
        className="absolute inset-0 rounded-[7%/5%] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 disabled:cursor-default"
        style={{
          transform,
          transition: 'transform 450ms cubic-bezier(.2,.8,.2,1)',
          zIndex: atDeck ? 5 : 1,
          perspective: '900px',
          containerType: 'inline-size',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: 'transform 450ms cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 rounded-[7%/5%] overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(150deg, #ffffff 0%, #faf8f2 55%, #efebe0 100%)',
              boxShadow: held
                ? '0 0 0 2px #fcd34d, 0 0 22px rgba(252,211,77,.6), 0 14px 22px rgba(0,0,0,.45)'
                : hinted
                  ? '0 0 0 2px #67e8f9, 0 0 16px rgba(103,232,249,.5), 0 8px 14px rgba(0,0,0,.4)'
                  : 'inset 0 0 0 1px rgba(0,0,0,.14), 0 8px 14px rgba(0,0,0,.4)',
              transition: 'box-shadow 200ms',
            }}
          >
            {card && <CardFace card={card} fourColor={fourColor} />}
          </div>
          {/* Dorso */}
          <div
            className="absolute inset-0 rounded-[7%/5%]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 6px 12px rgba(0,0,0,.4)' }}
          >
            <CardBack />
          </div>
        </div>
      </button>
      {/* Etiqueta bajo la carta */}
      <span
        aria-hidden="true"
        className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 sm:mt-3 px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-opacity ${
          held ? 'bg-amber-300 text-amber-950 opacity-100' : hinted ? 'bg-cyan-300/90 text-cyan-950 opacity-100' : 'opacity-0'
        }`}
      >
        {held ? text.held : hinted ? text.hint : '·'}
      </span>
    </div>
  );
};

export default CardView;

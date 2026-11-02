import React from 'react';
import { Card } from '../../src/games/videopoker/types';

// Ilustraciones de las figuras al estilo de las máquinas clásicas: trazo negro y colores planos.
const INK = '#1a1a1a';
const SKIN = '#f7cfa6';
const GOLD = '#f5c518';
const PURPLE = '#6d3fa6';
const PURPLE_DARK = '#4b2477';

const Crown: React.FC<{ y?: number; small?: boolean }> = ({ y = 0, small }) =>
  small ? (
    <g transform={`translate(0 ${y})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M35 30 L38 18 L44 25 L50 14 L56 25 L62 18 L65 30 Z" fill={GOLD} />
      <circle cx="50" cy="22" r="2.4" fill="#e11d48" />
    </g>
  ) : (
    <g transform={`translate(0 ${y})`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M29 36 L29 12 L37 22 L43 6 L50 20 L57 6 L63 22 L71 12 L71 36 Z" fill={GOLD} />
      <rect x="28" y="31" width="44" height="7" fill="#e0a800" />
      <circle cx="40" cy="34.5" r="2" fill="#e11d48" />
      <circle cx="50" cy="34.5" r="2" fill="#2563eb" />
      <circle cx="60" cy="34.5" r="2" fill="#e11d48" />
    </g>
  );

const Robe: React.FC<{ color: string }> = ({ color }) => (
  <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
    <path d="M8 110 L16 86 Q50 72 84 86 L92 110 Z" fill={color} />
    <path d="M36 80 L50 100 L64 80" fill="none" stroke={GOLD} strokeWidth="4" />
    <path d="M36 80 L50 100 L64 80" fill="none" />
    <path d="M14 100 Q50 90 86 100" fill="none" stroke={GOLD} strokeWidth="3" />
  </g>
);

const Eyes: React.FC = () => (
  <g fill={INK}>
    <ellipse cx="43" cy="53" rx="1.8" ry="2.2" />
    <ellipse cx="57" cy="53" rx="1.8" ry="2.2" />
    <path d="M39 48 Q43 46 46 48 M54 48 Q57 46 61 48" stroke={INK} strokeWidth="1.4" fill="none" />
  </g>
);

const King: React.FC = () => (
  <svg viewBox="0 0 100 110" className="w-full h-full">
    <Robe color={PURPLE} />
    <ellipse cx="50" cy="55" rx="17" ry="19" fill={SKIN} stroke={INK} strokeWidth="1.6" />
    <Eyes />
    <path d="M50 54 L48 62 L52 62" stroke={INK} strokeWidth="1.3" fill="none" />
    {/* Barba y bigote */}
    <path d="M33 56 Q32 82 50 88 Q68 82 67 56 Q62 70 50 70 Q38 70 33 56 Z" fill="#d9a441" stroke={INK} strokeWidth="1.6" />
    <path d="M40 66 Q50 61 60 66 Q50 69 40 66 Z" fill="#b9822a" stroke={INK} strokeWidth="1.2" />
    <Crown />
  </svg>
);

const Queen: React.FC = () => (
  <svg viewBox="0 0 100 110" className="w-full h-full">
    <path d="M26 58 Q22 30 50 28 Q78 30 74 58 Q78 80 70 90 L30 90 Q22 80 26 58 Z" fill="#f2c14e" stroke={INK} strokeWidth="1.6" />
    <Robe color={PURPLE} />
    <ellipse cx="50" cy="56" rx="15" ry="18" fill={SKIN} stroke={INK} strokeWidth="1.6" />
    <Eyes />
    <path d="M50 55 L48.5 62 L51.5 62" stroke={INK} strokeWidth="1.2" fill="none" />
    <path d="M44 67 Q50 71 56 67 Q50 69 44 67 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
    <circle cx="41" cy="62" r="2.5" fill="#fca5a5" opacity=".7" />
    <circle cx="59" cy="62" r="2.5" fill="#fca5a5" opacity=".7" />
    <path d="M35 44 Q50 34 65 44" fill="#f2c14e" stroke={INK} strokeWidth="1.4" />
    <Crown small y={8} />
  </svg>
);

const Jack: React.FC = () => (
  <svg viewBox="0 0 100 110" className="w-full h-full">
    <Robe color={PURPLE_DARK} />
    <path d="M32 50 Q30 72 36 76 L64 76 Q70 72 68 50 Z" fill="#8b5a2b" stroke={INK} strokeWidth="1.6" />
    <ellipse cx="50" cy="57" rx="15" ry="18" fill={SKIN} stroke={INK} strokeWidth="1.6" />
    <Eyes />
    <path d="M50 56 L48 63 L52 63" stroke={INK} strokeWidth="1.2" fill="none" />
    <path d="M42 68 Q50 65 58 68" stroke={INK} strokeWidth="1.6" fill="none" />
    {/* Sombrero */}
    <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M26 42 L32 14 L68 14 L74 42 Z" fill={PURPLE} />
      <rect x="25" y="36" width="50" height="8" fill={GOLD} />
      <path d="M32 14 L68 14" stroke={GOLD} strokeWidth="3" />
    </g>
  </svg>
);

const AceCrest: React.FC<{ suit: string; color: string }> = ({ suit, color }) => (
  <svg viewBox="0 0 100 110" className="w-full h-full">
    <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M30 18 L34 6 L42 13 L50 3 L58 13 L66 6 L70 18 Z" fill={GOLD} />
      <path d="M22 20 L78 20 L78 52 Q78 80 50 92 Q22 80 22 52 Z" fill="#fff" />
      <path d="M27 25 L73 25 L73 52 Q73 75 50 86 Q27 75 27 52 Z" fill={PURPLE} />
      <path d="M50 25 L50 86 M27 50 L73 50" stroke="#fff" strokeWidth="3" />
      <path d="M12 92 Q30 84 50 98 Q70 84 88 92 L84 104 Q68 96 50 108 Q32 96 16 104 Z" fill="#fff" />
    </g>
    <text x="50" y="62" textAnchor="middle" fontSize="30" fill={color} stroke="#fff" strokeWidth="1.5" paintOrder="stroke">
      {suit}
    </text>
  </svg>
);

export const CourtArt: React.FC<{ card: Card; suit: string; color: string }> = ({ card, suit, color }) => {
  if (card.rank === 13) return <King />;
  if (card.rank === 12) return <Queen />;
  if (card.rank === 11) return <Jack />;
  if (card.rank === 14) return <AceCrest suit={suit} color={color} />;
  return null;
};

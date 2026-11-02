import React from 'react';
import { CardBack } from './CardView';

interface Props {
  label: string;
  active: boolean; // se puede tocar para repartir/cambiar
  onClick: () => void;
}

/** Mazo sobre el tapete: tocarlo reparte o cambia las cartas. */
const Deck: React.FC<Props> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!active}
    aria-label={label}
    className="relative rounded-[7%/5%] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 disabled:cursor-default transition-transform enabled:active:scale-95"
    style={{ width: 'var(--cw)', height: 'calc(var(--cw) * 1.4)', WebkitTapHighlightColor: 'transparent' }}
  >
    {[3, 2, 1, 0].map((n) => (
      <div
        key={n}
        className="absolute inset-0"
        style={{ transform: `translate(${-n * 1.5}px, ${-n * 1.5}px)`, boxShadow: n === 3 ? '0 10px 18px rgba(0,0,0,.45)' : undefined, borderRadius: '7%/5%' }}
      >
        <CardBack />
      </div>
    ))}
    {active && (
      <span
        aria-hidden="true"
        className="absolute -inset-1.5 rounded-[9%/6.5%] ring-2 ring-amber-300/80 animate-pulse pointer-events-none"
        style={{ boxShadow: '0 0 22px rgba(252,211,77,.45)' }}
      />
    )}
  </button>
);

export default Deck;

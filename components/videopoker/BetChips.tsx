import React from 'react';

interface Props {
  bet: number;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

/** Fichas apiladas: una por crédito apostado. Tocar cambia la apuesta (1–5). */
const BetChips: React.FC<Props> = ({ bet, label, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="relative flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded-full disabled:opacity-80 transition-transform enabled:active:scale-95"
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative size-12 sm:size-14" style={{ marginTop: `${(bet - 1) * 4}px` }}>
      {Array.from({ length: bet }, (_, n) => (
        <div
          key={n}
          className="absolute inset-0 rounded-full"
          style={{
            transform: `translateY(${-n * 4}px)`,
            background: 'repeating-conic-gradient(#b91c1c 0 22.5deg, #f5f5f4 22.5deg 45deg)',
            boxShadow: '0 2px 0 #7f1d1d, 0 4px 8px rgba(0,0,0,.45)',
          }}
        >
          <div
            className="absolute rounded-full flex items-center justify-center font-black text-white text-sm sm:text-base"
            style={{
              inset: '16%',
              background: 'radial-gradient(circle at 40% 35%, #ef4444, #991b1b)',
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.75), inset 0 0 0 4px #991b1b, inset 0 0 0 5px rgba(255,255,255,.35)',
              fontFamily: 'Georgia, serif',
            }}
          >
            {n === bet - 1 ? bet : ''}
          </div>
        </div>
      ))}
    </div>
  </button>
);

export default BetChips;

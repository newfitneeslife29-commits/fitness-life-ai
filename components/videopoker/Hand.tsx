import React from 'react';
import { Card } from '../../src/games/videopoker/types';
import CardView from './CardView';
import { Texts } from './i18n';

interface Props {
  hand: (Card | undefined)[];
  dealt: boolean; // hay mano en la mesa
  faceUp: boolean[];
  held: boolean[];
  hints: boolean[] | null;
  canHold: boolean;
  fourColor: boolean;
  text: Texts;
  onToggle: (index: number) => void;
}

const Hand: React.FC<Props> = ({ hand, dealt, faceUp, held, hints, canHold, fourColor, text, onToggle }) => (
  <div className="flex justify-center" style={{ gap: 'var(--gap)' }}>
    {[0, 1, 2, 3, 4].map((i) =>
      dealt ? (
        <CardView
          key={i}
          index={i}
          card={hand[i]}
          faceUp={faceUp[i]}
          atDeck={!faceUp[i]}
          held={held[i]}
          hinted={!!hints?.[i] && !held[i]}
          disabled={!canHold}
          fourColor={fourColor}
          text={text}
          onToggle={() => onToggle(i)}
        />
      ) : (
        // Huecos marcados en el tapete antes de la primera mano
        <div
          key={i}
          aria-hidden="true"
          className="rounded-[7%/5%] border-2 border-dashed border-amber-200/25"
          style={{ width: 'var(--cw)', height: 'calc(var(--cw) * 1.4)' }}
        />
      ),
    )}
  </div>
);

export default Hand;

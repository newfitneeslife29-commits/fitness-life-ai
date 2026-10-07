import React from 'react';
import { Card } from '../../src/games/videopoker/types';
import CardView from './CardView';
import { Texts } from './i18n';

interface Props {
  hand: (Card | undefined)[];
  faceUp: boolean[];
  held: boolean[];
  hints: boolean[] | null;
  canHold: boolean;
  fourColor: boolean;
  text: Texts;
  onToggle: (index: number) => void;
}

const Hand: React.FC<Props> = ({ hand, faceUp, held, hints, canHold, fourColor, text, onToggle }) => (
  <div className="flex justify-center gap-1.5 sm:gap-4">
    {[0, 1, 2, 3, 4].map((i) => (
      <CardView
        key={i}
        index={i}
        card={hand[i]}
        faceUp={faceUp[i]}
        held={held[i]}
        hinted={!!hints?.[i] && !held[i]}
        disabled={!canHold}
        fourColor={fourColor}
        text={text}
        onToggle={() => onToggle(i)}
      />
    ))}
  </div>
);

export default Hand;

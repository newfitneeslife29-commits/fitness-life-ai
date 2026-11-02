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
  flipMs: number;
  text: Texts;
  onToggle: (index: number) => void;
}

const LABEL = 'clamp(10px, 2.4cqw, 26px)';
// El ancho de carta también se limita por la altura de la pantalla para que todo quepa sin desplazarse.
const CARD_MAX = 'min(210px, max(64px, calc((100dvh - 470px) / 1.4)))';

const Hand: React.FC<Props> = ({ hand, faceUp, held, hints, canHold, fourColor, flipMs, text, onToggle }) => (
  <div className="flex justify-center" style={{ gap: 'clamp(6px, 2cqw, 26px)' }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const hinted = !!hints?.[i] && !held[i];
      return (
        <div key={i} className="flex-1 min-w-0 flex flex-col items-center" style={{ maxWidth: CARD_MAX }}>
          <span
            aria-hidden="true"
            className={`font-black uppercase leading-none mb-[0.6cqw] ${held ? 'text-white' : hinted ? 'text-cyan-300' : 'text-transparent'}`}
            style={{ fontSize: LABEL, letterSpacing: '.04em', textShadow: held ? '0 2px 0 #000' : undefined }}
          >
            {held ? text.held : hinted ? text.hint : 'HELD'}
          </span>
          <CardView
            index={i}
            card={hand[i]}
            faceUp={faceUp[i]}
            held={held[i]}
            hinted={hinted}
            disabled={!canHold}
            fourColor={fourColor}
            flipMs={flipMs}
            text={text}
            onToggle={() => onToggle(i)}
          />
        </div>
      );
    })}
  </div>
);

export default Hand;

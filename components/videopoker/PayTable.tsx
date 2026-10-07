import React from 'react';
import { payout } from '../../src/games/videopoker/paytable';
import { HAND_RANKS, HandRank, MAX_BET } from '../../src/games/videopoker/types';
import { Texts } from './i18n';

interface Props {
  bet: number;
  winning: HandRank | null;
  text: Texts;
}

const ROWS = HAND_RANKS.filter((r) => r !== 'NOTHING');
const BETS = Array.from({ length: MAX_BET }, (_, i) => i + 1);
const GLOW = { textShadow: '0 0 6px rgba(250,204,21,.55)' };

const PayTable: React.FC<Props> = ({ bet, winning, text }) => (
  <div className="rounded-md border-2 border-yellow-400/80 bg-[#0b1f8f]/70 overflow-hidden">
    <table className="w-full text-[10px] sm:text-sm font-extrabold uppercase sm:tracking-wide text-yellow-300" style={GLOW}>
      <caption className="sr-only">{text.subtitle}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{text.hand}</th>
          {BETS.map((b) => (
            <th key={b} scope="col">{`${text.bet} ${b}`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((rank) => {
          const isWin = winning === rank;
          return (
            <tr key={rank} className={isWin ? 'bg-yellow-300 text-[#0b1f8f] animate-pulse' : ''}>
              <th scope="row" className="text-left pl-2 pr-1 sm:px-3 py-[1px] sm:py-0.5 leading-tight sm:whitespace-nowrap font-extrabold">
                {text.hands[rank]}
              </th>
              {BETS.map((b) => (
                <td
                  key={b}
                  className={`text-right px-1 sm:px-3 py-[1px] sm:py-0.5 tabular-nums ${
                    b === bet && !isWin ? 'bg-red-600/90 text-yellow-200' : ''
                  }`}
                >
                  {payout(rank, b)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default PayTable;

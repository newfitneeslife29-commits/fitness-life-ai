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

const PayTable: React.FC<Props> = ({ bet, winning, text }) => (
  <div className="rounded-xl border border-amber-200/30 bg-black/30 overflow-hidden">
    <table className="w-full text-[10px] sm:text-sm font-bold uppercase sm:tracking-wide text-amber-100">
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
            <tr key={rank} className={isWin ? 'bg-amber-300 text-amber-950' : 'border-t border-white/5'}>
              <th scope="row" className="text-left pl-2 pr-1 sm:px-3 py-1.5 leading-tight sm:whitespace-nowrap font-bold">
                {text.hands[rank]}
              </th>
              {BETS.map((b) => (
                <td
                  key={b}
                  className={`text-right px-1 sm:px-3 py-1.5 tabular-nums ${
                    b === bet && !isWin ? 'bg-amber-300/15 text-amber-300' : ''
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

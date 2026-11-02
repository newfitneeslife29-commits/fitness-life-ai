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
const YELLOW = '#f8ec4f';
const LINE = '2px solid #e9de5a';

/** Tabla de premios clásica: texto amarillo con puntos guía y la columna de la apuesta en rojo. */
const PayTable: React.FC<Props> = ({ bet, winning, text }) => (
  <table
    className="w-full table-fixed border-collapse uppercase font-bold"
    style={{ fontSize: 'clamp(9px, 1.45cqw, 16px)', color: YELLOW, background: '#121c5c', border: LINE, lineHeight: 1.2 }}
  >
    <caption className="sr-only">{text.subtitle}</caption>
    <colgroup>
      <col style={{ width: '40%' }} />
      {BETS.map((b) => (
        <col key={b} style={{ width: '12%' }} />
      ))}
    </colgroup>
    <thead className="sr-only">
      <tr>
        <th scope="col">{text.hand}</th>
        {BETS.map((b) => (
          <th key={b} scope="col">{`${text.bet} ${b}`}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {ROWS.map((rank, r) => {
        const isWin = winning === rank;
        const pad = r === 0 ? 'pt-[0.5cqw]' : r === ROWS.length - 1 ? 'pb-[0.5cqw]' : '';
        return (
          <tr key={rank} className={isWin ? 'vp-blink' : ''} style={isWin ? { color: '#fff' } : undefined}>
            <th scope="row" className={`text-left font-bold pl-[1cqw] pr-[0.6cqw] ${pad}`}>
              <span className="flex items-baseline overflow-hidden whitespace-nowrap">
                <span className="shrink-0">{text.hands[rank]}</span>
                <span aria-hidden="true" className="ml-[0.3em] overflow-hidden" style={{ letterSpacing: '.12em' }}>
                  {'.'.repeat(60)}
                </span>
              </span>
            </th>
            {BETS.map((b) => (
              <td
                key={b}
                className={`text-right tabular-nums pr-[0.8cqw] ${pad}`}
                style={{ borderLeft: LINE, background: b === bet ? '#e8321e' : undefined }}
              >
                {payout(rank, b)}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>
);

export default PayTable;

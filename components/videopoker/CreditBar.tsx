import React from 'react';
import { Texts } from './i18n';

interface Props {
  win: number;
  bet: number;
  credits: number;
  text: Texts;
}

const Item: React.FC<{ label: string; value: number; align: string }> = ({ label, value, align }) => (
  <div className={`flex flex-col ${align}`}>
    <span className="text-[9px] sm:text-xs font-bold uppercase tracking-widest text-yellow-300/80">{label}</span>
    <span
      className="font-mono text-lg sm:text-3xl font-bold tabular-nums text-red-500 leading-none"
      style={{ textShadow: '0 0 8px rgba(239,68,68,.75)' }}
    >
      {value}
    </span>
  </div>
);

const CreditBar: React.FC<Props> = ({ win, bet, credits, text }) => (
  <div className="flex items-end justify-between gap-2 px-1">
    <Item label={text.win} value={win} align="items-start" />
    <Item label={text.bet} value={bet} align="items-center" />
    <Item label={text.credits} value={credits} align="items-end" />
  </div>
);

export default CreditBar;

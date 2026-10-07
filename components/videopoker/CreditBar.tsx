import React from 'react';
import { Texts } from './i18n';

interface Props {
  win: number;
  bet: number;
  credits: number;
  text: Texts;
}

const Item: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-yellow-300/80">{label}</span>
    <span className={`text-lg sm:text-2xl font-black tabular-nums ${accent ? 'text-yellow-300' : 'text-white'}`}>{value}</span>
  </div>
);

const CreditBar: React.FC<Props> = ({ win, bet, credits, text }) => (
  <div className="flex items-end justify-between gap-2 px-1">
    <Item label={text.win} value={win} accent={win > 0} />
    <Item label={text.bet} value={bet} />
    <Item label={text.credits} value={credits} />
  </div>
);

export default CreditBar;

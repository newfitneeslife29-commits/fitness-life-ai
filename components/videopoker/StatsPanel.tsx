import React from 'react';
import { HAND_RANKS, Stats } from '../../src/games/videopoker/types';
import { Texts } from './i18n';

interface Props {
  stats: Stats;
  sessionSeconds: number;
  text: Texts;
  onReset: () => void;
}

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const StatsPanel: React.FC<Props> = ({ stats, sessionSeconds, text, onReset }) => {
  const rtp = stats.totalBet > 0 ? (stats.totalWon / stats.totalBet) * 100 : 0;
  const tiles: [string, string][] = [
    [text.handsPlayed, String(stats.handsPlayed)],
    [text.totalBet, String(stats.totalBet)],
    [text.totalWon, String(stats.totalWon)],
    [text.realRtp, stats.totalBet > 0 ? `${rtp.toFixed(1)} %` : '—'],
    [text.biggestWin, String(stats.biggestWin)],
    [text.session, formatTime(sessionSeconds)],
  ];

  return (
    <section className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 p-4 sm:p-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-light dark:bg-white/5 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {HAND_RANKS.map((rank) => {
            const n = stats.byRank[rank];
            const pct = stats.handsPlayed > 0 ? (n / stats.handsPlayed) * 100 : 0;
            return (
              <tr key={rank} className="border-t border-slate-100 dark:border-white/5">
                <th scope="row" className="text-left font-bold py-1.5 text-slate-700 dark:text-slate-300">{text.hands[rank]}</th>
                <td className="text-right tabular-nums text-slate-900 dark:text-white font-bold">{n}</td>
                <td className="text-right tabular-nums text-slate-500 dark:text-slate-400 w-20">{pct.toFixed(2)} %</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onReset}
        className="self-start px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
      >
        {text.resetStats}
      </button>
    </section>
  );
};

export default StatsPanel;

import { fmtNumber, fmtShortDate } from '../lib/format';

// Small, dependency-free SVG charts sized to the phone column.

const niceStep = (span: number) => [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000].find(s => span / s <= 4) ?? 10000;

export const LineChart = ({ points, unit, emptyText }: {
    points: { date: string; value: number }[];
    unit: string;
    emptyText: string;
}) => {
    if (points.length < 2) {
        return <p className="py-10 text-center text-sm text-white/50">{emptyText}</p>;
    }
    const W = 340, H = 180, padL = 36, padR = 12, padT = 12, padB = 24;
    const values = points.map(p => p.value);
    const min = Math.min(...values), max = Math.max(...values);
    const pad = (max - min || Math.max(1, max * 0.1)) * 0.2;
    const step = niceStep(max - min + 2 * pad);
    const lo = Math.max(0, Math.floor((min - pad) / step) * step);
    const hi = Math.ceil((max + pad) / step) * step;
    const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
    const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
    const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const last = values.length - 1;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
            aria-label={`De ${fmtNumber(values[0])} a ${fmtNumber(values[last])} ${unit}`}>
            {ticks.map(t => (
                <g key={t}>
                    <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#2a303a" strokeWidth={1} />
                    <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#ffffff73">{fmtNumber(t)}</text>
                </g>
            ))}
            <path d={path} fill="none" stroke="#f26b1d" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4.5 : 3} fill={i === last ? '#f26b1d' : '#12151a'} stroke="#f26b1d" strokeWidth={1.75}>
                    <title>{`${fmtShortDate(points[i].date)}: ${fmtNumber(v)} ${unit}`}</title>
                </circle>
            ))}
            <text x={x(last)} y={y(values[last]) - 9} textAnchor="end" fontSize={11} fontWeight={600} fill="#fff">{fmtNumber(values[last])}</text>
            <text x={padL} y={H - 6} fontSize={10} fill="#ffffff73">{fmtShortDate(points[0].date)}</text>
            <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="#ffffff73">{fmtShortDate(points[last].date)}</text>
        </svg>
    );
};

// One bar per week; the current week is highlighted and the target drawn as a line.
export const WeekBars = ({ weeks, target }: { weeks: { weekStart: Date; sessions: number }[]; target: number }) => {
    const W = 340, H = 140, padB = 22, padT = 16;
    const max = Math.max(target, ...weeks.map(w => w.sessions), 1);
    const slot = W / weeks.length;
    const barW = Math.min(26, slot * 0.6);
    const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
            aria-label={`Entrenos por semana; objetivo ${target}`}>
            <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="#34d399" strokeDasharray="4 4" strokeWidth={1} />
            <text x={W} y={y(target) - 4} textAnchor="end" fontSize={10} fill="#34d399">objetivo {target}</text>
            {weeks.map((w, i) => {
                const cx = slot * i + slot / 2;
                const current = i === weeks.length - 1;
                const h = (H - padT - padB) * (w.sessions / max);
                return (
                    <g key={i}>
                        <rect x={cx - barW / 2} y={y(w.sessions)} width={barW} height={Math.max(h, w.sessions ? 2 : 0)} rx={5}
                            fill={current ? '#f26b1d' : '#3a414d'}>
                            <title>{`Semana del ${fmtShortDate(w.weekStart)}: ${w.sessions}`}</title>
                        </rect>
                        {w.sessions > 0 && <text x={cx} y={y(w.sessions) - 4} textAnchor="middle" fontSize={10} fill="#ffffffb3">{w.sessions}</text>}
                        <text x={cx} y={H - 6} textAnchor="middle" fontSize={9.5} fill={current ? '#fff' : '#ffffff66'}>
                            {current ? 'Esta' : fmtShortDate(w.weekStart).replace('.', '')}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// GitHub-style grid: one column per week, one row per weekday.
export const TrainingCalendar = ({ weeks }: { weeks: { date: Date; count: number; volumeKg: number; future: boolean }[][] }) => {
    const cell = 15, gap = 3, left = 18, top = 14;
    const W = left + weeks.length * (cell + gap), H = top + 7 * (cell + gap);
    const maxVol = Math.max(1, ...weeks.flat().map(d => d.volumeKg));
    const trained = weeks.flat().filter(d => d.count > 0).length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${trained} días entrenados en las últimas ${weeks.length} semanas`}>
            {['L', 'X', 'D'].map((label, i) => (
                <text key={label} x={0} y={top + [0, 2, 6][i] * (cell + gap) + 11} fontSize={9} fill="#ffffff59">{label}</text>
            ))}
            {weeks.map((week, w) => (
                <g key={w}>
                    {week[0].date.getDate() <= 7 && (
                        <text x={left + w * (cell + gap)} y={9} fontSize={9} fill="#ffffff59">
                            {week[0].date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                        </text>
                    )}
                    {week.map((d, i) => (
                        <rect key={i} x={left + w * (cell + gap)} y={top + i * (cell + gap)} width={cell} height={cell} rx={3.5}
                            fill={d.future ? 'transparent' : d.count ? '#f26b1d' : '#1f242c'}
                            fillOpacity={d.count ? 0.45 + 0.55 * (d.volumeKg / maxVol) : 1}
                            stroke={d.future ? '#1f242c' : 'none'}>
                            <title>{`${d.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}${d.count ? `: ${d.count} entreno${d.count > 1 ? 's' : ''}` : ''}`}</title>
                        </rect>
                    ))}
                </g>
            ))}
        </svg>
    );
};

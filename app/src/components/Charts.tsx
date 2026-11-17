import { t, tp } from '../i18n';
import { fmtMonth, fmtNumber, fmtShortDate } from '../lib/format';

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
            aria-label={t('chart.trend', { from: fmtNumber(values[0]), to: fmtNumber(values[last]), unit })}>
            {ticks.map(t => (
                <g key={t}>
                    <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
                    <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} className="fill-white/45">{fmtNumber(t)}</text>
                </g>
            ))}
            <path d={path} fill="none" className="stroke-brand" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4.5 : 3} className={i === last ? 'fill-brand stroke-brand' : 'fill-ink-2 stroke-brand'} strokeWidth={1.75}>
                    <title>{`${fmtShortDate(points[i].date)}: ${fmtNumber(v)} ${unit}`}</title>
                </circle>
            ))}
            <text x={x(last)} y={y(values[last]) - 9} textAnchor="end" fontSize={11} fontWeight={600} className="fill-white">{fmtNumber(values[last])}</text>
            <text x={padL} y={H - 6} fontSize={10} className="fill-white/45">{fmtShortDate(points[0].date)}</text>
            <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} className="fill-white/45">{fmtShortDate(points[last].date)}</text>
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
            aria-label={t('chart.weeks', { target })}>
            <line x1={0} x2={W} y1={y(target)} y2={y(target)} className="stroke-good" strokeDasharray="4 4" strokeWidth={1} />
            <text x={W} y={y(target) - 4} textAnchor="end" fontSize={10} className="fill-good">{t('chart.target', { target })}</text>
            {weeks.map((w, i) => {
                const cx = slot * i + slot / 2;
                const current = i === weeks.length - 1;
                const h = (H - padT - padB) * (w.sessions / max);
                return (
                    <g key={i}>
                        <rect x={cx - barW / 2} y={y(w.sessions)} width={barW} height={Math.max(h, w.sessions ? 2 : 0)} rx={5}
                            className={current ? 'fill-brand' : 'fill-white/20'}>
                            <title>{t('chart.weekOf', { date: fmtShortDate(w.weekStart), n: w.sessions })}</title>
                        </rect>
                        {w.sessions > 0 && <text x={cx} y={y(w.sessions) - 4} textAnchor="middle" fontSize={10} className="fill-white/70">{w.sessions}</text>}
                        <text x={cx} y={H - 6} textAnchor="middle" fontSize={9.5} className={current ? 'fill-white' : 'fill-white/40'}>
                            {current ? t('chart.thisWeek') : fmtShortDate(w.weekStart).replace('.', '')}
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
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('chart.calendar', { n: trained, weeks: weeks.length })}>
            {[t('chart.mon'), t('chart.wed'), t('chart.sun')].map((label, i) => (
                <text key={label} x={0} y={top + [0, 2, 6][i] * (cell + gap) + 11} fontSize={9} className="fill-white/35">{label}</text>
            ))}
            {weeks.map((week, w) => (
                <g key={w}>
                    {week[0].date.getDate() <= 7 && (
                        <text x={left + w * (cell + gap)} y={9} fontSize={9} className="fill-white/35">
                            {fmtMonth(week[0].date)}
                        </text>
                    )}
                    {week.map((d, i) => (
                        <rect key={i} x={left + w * (cell + gap)} y={top + i * (cell + gap)} width={cell} height={cell} rx={3.5}
                            className={d.future ? 'fill-transparent stroke-ink-3' : d.count ? 'fill-brand' : 'fill-ink-3'}
                            fillOpacity={d.count ? 0.45 + 0.55 * (d.volumeKg / maxVol) : 1}>
                            <title>{`${fmtShortDate(d.date)}${d.count ? `: ${tp('common.workouts', d.count)}` : ''}`}</title>
                        </rect>
                    ))}
                </g>
            ))}
        </svg>
    );
};

// Volume per week as bars, the current week highlighted.
export const VolumeBars = ({ weeks, format }: { weeks: { weekStart: Date; volumeKg: number }[]; format: (kg: number) => string }) => {
    const W = 340, H = 150, padB = 22, padT = 22;
    const max = Math.max(...weeks.map(w => w.volumeKg), 1);
    const slot = W / weeks.length;
    const barW = Math.min(28, slot * 0.62);
    const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
    const best = weeks.reduce((b, w, i) => (w.volumeKg > weeks[b].volumeKg ? i : b), 0);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('chart.volume')}>
            <defs>
                <linearGradient id="vol-now" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f26b1d" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
            </defs>
            {weeks.map((w, i) => {
                const cx = slot * i + slot / 2;
                const current = i === weeks.length - 1;
                const h = (H - padT - padB) * (w.volumeKg / max);
                return (
                    <g key={i}>
                        <rect x={cx - barW / 2} y={padT} width={barW} height={H - padT - padB} rx={7} className="fill-white/[0.05]" />
                        {w.volumeKg > 0 && (
                            <rect x={cx - barW / 2} y={y(w.volumeKg)} width={barW} height={Math.max(h, 3)} rx={7}
                                fill={current ? 'url(#vol-now)' : undefined} className={current ? '' : 'fill-sky-400/60'}>
                                <title>{`${fmtShortDate(w.weekStart)}: ${format(w.volumeKg)}`}</title>
                            </rect>
                        )}
                        {(current || i === best) && w.volumeKg > 0 && (
                            <text x={cx} y={y(w.volumeKg) - 6} textAnchor="middle" fontSize={9.5} fontWeight={700} className="fill-white/80">{format(w.volumeKg)}</text>
                        )}
                        <text x={cx} y={H - 6} textAnchor="middle" fontSize={9.5} className={current ? 'fill-white' : 'fill-white/40'}>
                            {current ? t('chart.thisWeek') : fmtShortDate(w.weekStart).replace('.', '')}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// A donut of shares (e.g. sets per muscle this month), with the total inside.
export const Donut = ({ parts, total, label }: { parts: { value: number; color: string }[]; total: string; label: string }) => {
    const r = 42, c = 2 * Math.PI * r;
    const sum = parts.reduce((s, p) => s + p.value, 0) || 1;
    let offset = 0;
    return (
        <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={label}>
            <circle cx={55} cy={55} r={r} fill="none" strokeWidth={14} className="stroke-ink-4" />
            {parts.map((p, i) => {
                const len = (p.value / sum) * c;
                const el = <circle key={i} cx={55} cy={55} r={r} fill="none" strokeWidth={14} stroke={p.color} strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-offset} />;
                offset += len;
                return el;
            })}
            <text x={55} y={-50} transform="rotate(90)" textAnchor="middle" fontSize={20} fontWeight={800} className="fill-white">{total}</text>
            <text x={55} y={-35} transform="rotate(90)" textAnchor="middle" fontSize={9} className="fill-white/50">{label}</text>
        </svg>
    );
};

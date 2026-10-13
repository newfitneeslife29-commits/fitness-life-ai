// Share cards drawn on a canvas (no libraries, works offline): "Gym Wrapped"
// stories (1080×1920, dark) and the before/after photo comparison. Every card
// carries the Fitness Life logo.

export const BRAND = 'FITNESS LIFE';
const FONT = '"Inter Variable", Inter, system-ui, sans-serif';
const ORANGE = '#f26b1d';
const INK = '#0b0d10';

export const ensureFonts = async () => {
    try {
        await Promise.all([document.fonts.load(`800 80px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]);
    } catch {
        // System font then.
    }
};

export const newCanvas = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext('2d')! };
};

const font = (ctx: CanvasRenderingContext2D, weight: number, size: number) => { ctx.font = `${weight} ${size}px ${FONT}`; };

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

// Dark background with two soft glows.
export const darkBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, accent = ORANGE) => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    const glow = (x: number, y: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(11,13,16,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    };
    glow(w * 0.1, h * 0.08, w * 0.9, `${accent}55`);
    glow(w * 0.95, h * 0.95, w * 0.9, 'rgba(168,85,247,0.28)');
};

// The brand mark: a W over a V with a notched diamond between them,
// 120 wide (x -60..60) and 108 tall (y -3..105). Same shape as the app icon.
export const MARK_PATH =
    'M-60 -3L-15 42L0 27L15 42L60 -3L60 17L15 62L0 47L-15 62L-60 17Z' +
    'M-60 25L0 85L60 25L60 45L0 105L-60 45Z' +
    'M-11 66L-3 58L0 61L3 58L11 66L0 77Z';

// The app icon and the name.
export const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opts: { name?: boolean; align?: 'left' | 'center'; color?: string } = {}) => {
    const s = size / 512;
    const nameSize = size * 0.42;
    font(ctx, 800, nameSize);
    const textW = opts.name === false ? 0 : ctx.measureText(BRAND).width + size * 0.3;
    const left = opts.align === 'center' ? x - (size + textW) / 2 : x;
    ctx.save();
    roundRect(ctx, left, y, size, size, 112 * s);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = ORANGE;
    ctx.save();
    ctx.translate(left + 256 * s, y + 262 * s);
    ctx.scale(2.5 * s, 2.5 * s);
    ctx.translate(0, -51);
    ctx.fill(new Path2D(MARK_PATH));
    ctx.restore();
    if (opts.name !== false) {
        ctx.fillStyle = opts.color ?? '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        font(ctx, 800, nameSize);
        ctx.fillText(BRAND, left + size * 1.3, y + size / 2 + 2);
    }
    ctx.restore();
};

const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, opts: { size: number; weight?: number; color?: string; align?: CanvasTextAlign; maxWidth?: number }) => {
    font(ctx, opts.weight ?? 600, opts.size);
    ctx.fillStyle = opts.color ?? '#ffffff';
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    // Shrink long text to fit.
    if (opts.maxWidth) {
        let size = opts.size;
        while (size > 20 && ctx.measureText(value).width > opts.maxWidth) {
            size -= 4;
            font(ctx, opts.weight ?? 600, size);
        }
    }
    ctx.fillText(value, x, y);
};

// Wraps text in lines that fit `maxWidth`; returns the y after the last line.
const paragraph = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, opts: { size: number; weight?: number; color?: string; align?: CanvasTextAlign; lineHeight?: number }) => {
    font(ctx, opts.weight ?? 500, opts.size);
    const words = value.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (ctx.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else line = next;
    }
    if (line) lines.push(line);
    const lh = opts.lineHeight ?? opts.size * 1.25;
    lines.forEach((l, i) => text(ctx, l, x, y + i * lh, opts));
    return y + lines.length * lh;
};

export interface StoryStat { value: string; label: string }

// Behind the numbers: the plain dark design, a gym poster drawn here (a
// barbell under spotlights) or the user's own photo.
type Picture = CanvasImageSource & { width: number; height: number };
export type CardBackground = { kind: 'plain' } | { kind: 'gym' } | { kind: 'photo'; image: Picture };

// Small seeded random, so the dust in the gym poster is the same every time.
const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
};

const plate = (ctx: CanvasRenderingContext2D, x: number, w: number, h: number) => {
    const g = ctx.createLinearGradient(x, -h / 2, x + w, h / 2);
    g.addColorStop(0, '#2b3038');
    g.addColorStop(0.5, '#15181d');
    g.addColorStop(1, '#0d0f12');
    roundRect(ctx, x, -h / 2, w, h, 14);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(242,107,29,0.85)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 8, -h / 2 + 18, 6, h - 36);
};

const barbell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, scale: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.shadowColor = 'rgba(242,107,29,0.55)';
    ctx.shadowBlur = 70;
    const bar = ctx.createLinearGradient(0, -16, 0, 16);
    bar.addColorStop(0, '#6b737c');
    bar.addColorStop(0.45, '#eef1f4');
    bar.addColorStop(1, '#5a6169');
    roundRect(ctx, -700, -15, 1400, 30, 15);
    ctx.fillStyle = bar;
    ctx.fill();
    ctx.shadowBlur = 40;
    for (const side of [1, -1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.fillStyle = '#9aa2ab';
        roundRect(ctx, 380, -38, 34, 76, 8);
        ctx.fill();
        let x = 420;
        for (const [w, h] of [[78, 560], [66, 470], [54, 370], [44, 270]]) {
            plate(ctx, x, w, h);
            x += w + 8;
        }
        ctx.restore();
    }
    ctx.restore();
};

const gymPoster = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120c09');
    bg.addColorStop(0.55, '#0b0d10');
    bg.addColorStop(1, '#170d07');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Spotlights from the ceiling.
    for (const [x, spread, a] of [[w * 0.2, 520, 0.16], [w * 0.75, 620, 0.2], [w * 0.5, 380, 0.1]] as const) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, `rgba(255,190,140,${a})`);
        g.addColorStop(0.8, 'rgba(242,107,29,0)');
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x + spread, h);
        ctx.lineTo(x - spread, h);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
    }
    // Huge faint word behind everything.
    ctx.save();
    ctx.translate(w / 2, h * 0.58);
    ctx.rotate(-Math.PI / 2);
    font(ctx, 900, 330);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillText('NO LIMITS', 0, 0);
    ctx.restore();
    // Floor glow and the barbell.
    const floor = ctx.createRadialGradient(w / 2, h * 0.93, 0, w / 2, h * 0.93, w * 0.8);
    floor.addColorStop(0, 'rgba(242,107,29,0.35)');
    floor.addColorStop(1, 'rgba(242,107,29,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.9;
    barbell(ctx, w / 2, h * 0.925, -0.08, 0.5);
    ctx.restore();
    // Chalk dust.
    const rand = seeded(42);
    for (let i = 0; i < 90; i++) {
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 1 + rand() * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.18})`;
        ctx.fill();
    }
    // Keep the text area readable.
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(11,13,16,0.35)');
    shade.addColorStop(0.6, 'rgba(11,13,16,0.25)');
    shade.addColorStop(1, 'rgba(11,13,16,0.05)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
};

const photoBackground = (ctx: CanvasRenderingContext2D, image: Picture, w: number, h: number) => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    cover(ctx, image, 0, 0, w, h);
    // Darker at the top and bottom, where the text is; the photo shows through.
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(11,13,16,0.82)');
    shade.addColorStop(0.32, 'rgba(11,13,16,0.45)');
    shade.addColorStop(0.62, 'rgba(11,13,16,0.4)');
    shade.addColorStop(1, 'rgba(11,13,16,0.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
};

let boxFill = 'rgba(255,255,255,0.06)';


const W = 1080, H = 1920, PAD = 90;

const storyFrame = (eyebrow: string, title: string, bg: CardBackground = { kind: 'plain' }) => {
    const { canvas, ctx } = newCanvas(W, H);
    if (bg.kind === 'photo') photoBackground(ctx, bg.image, W, H);
    else if (bg.kind === 'gym') gymPoster(ctx, W, H);
    else darkBackground(ctx, W, H);
    // Over a picture, text gets a soft shadow and boxes a dark glass.
    boxFill = bg.kind === 'plain' ? 'rgba(255,255,255,0.06)' : 'rgba(11,13,16,0.6)';
    if (bg.kind !== 'plain') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 18;
    }
    drawLogo(ctx, PAD, 110, 84);
    text(ctx, eyebrow.toUpperCase(), PAD, 330, { size: 40, weight: 700, color: ORANGE });
    text(ctx, title, PAD, 410, { size: 72, weight: 800, maxWidth: W - PAD * 2 });
    return { canvas, ctx };
};

const statsRow = (ctx: CanvasRenderingContext2D, stats: StoryStat[], y: number) => {
    const colW = (W - PAD * 2) / stats.length;
    stats.forEach((s, i) => {
        const x = PAD + colW * i;
        roundRect(ctx, x + 8, y, colW - 16, 210, 36);
        ctx.fillStyle = boxFill;
        ctx.fill();
        text(ctx, s.value, x + colW / 2, y + 112, { size: 64, weight: 800, align: 'center', maxWidth: colW - 40 });
        text(ctx, s.label, x + colW / 2, y + 168, { size: 30, weight: 500, color: 'rgba(255,255,255,0.6)', align: 'center', maxWidth: colW - 40 });
    });
};

const footer = (ctx: CanvasRenderingContext2D, line: string) => {
    text(ctx, line, W / 2, H - 110, { size: 32, weight: 500, color: 'rgba(255,255,255,0.45)', align: 'center' });
};

// 1. Weight lifted this month, and what it compares to.
export const volumeStory = (o: { bg?: CardBackground; eyebrow: string; title: string; big: string; bigLabel: string; emoji?: string; equivalence?: string; stats: StoryStat[]; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title, o.bg);
    text(ctx, o.big, W / 2, 760, { size: 190, weight: 900, align: 'center', maxWidth: W - PAD * 2 });
    text(ctx, o.bigLabel, W / 2, 840, { size: 48, weight: 600, color: 'rgba(255,255,255,0.7)', align: 'center' });
    if (o.emoji && o.equivalence) {
        ctx.textAlign = 'center';
        ctx.font = `200px ${FONT}`;
        ctx.fillText(o.emoji, W / 2, 1140);
        paragraph(ctx, o.equivalence, W / 2, 1260, W - PAD * 2, { size: 58, weight: 800, align: 'center', color: '#ffffff' });
    }
    statsRow(ctx, o.stats, 1440);
    footer(ctx, o.footer);
    return canvas;
};

// 2. Personal records of the month.
export const recordsStory = (o: { bg?: CardBackground; eyebrow: string; title: string; rows: { name: string; value: string; badge?: string }[]; empty: string; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title, o.bg);
    let y = 560;
    if (!o.rows.length) paragraph(ctx, o.empty, W / 2, 900, W - PAD * 2, { size: 52, weight: 700, align: 'center' });
    o.rows.forEach((r, i) => {
        roundRect(ctx, PAD, y, W - PAD * 2, 190, 40);
        const g = ctx.createLinearGradient(PAD, y, W - PAD, y);
        const plain = boxFill.startsWith('rgba(255');
        g.addColorStop(0, i === 0 ? 'rgba(242,107,29,0.45)' : plain ? 'rgba(255,255,255,0.08)' : boxFill);
        g.addColorStop(1, plain ? 'rgba(255,255,255,0.04)' : 'rgba(11,13,16,0.45)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.font = `76px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(i === 0 ? '🏆' : '💪', PAD + 40, y + 122);
        text(ctx, r.name, PAD + 160, y + 82, { size: 44, weight: 700, maxWidth: W - PAD * 2 - 200 });
        text(ctx, r.value, PAD + 160, y + 144, { size: 40, weight: 600, color: 'rgba(255,255,255,0.65)' });
        if (r.badge) {
            font(ctx, 800, 28);
            const bw = ctx.measureText(r.badge).width + 40;
            roundRect(ctx, W - PAD - bw - 30, y + 110, bw, 52, 26);
            ctx.fillStyle = ORANGE;
            ctx.fill();
            text(ctx, r.badge, W - PAD - 30 - bw / 2, y + 146, { size: 28, weight: 800, align: 'center', color: INK });
        }
        y += 220;
    });
    footer(ctx, o.footer);
    return canvas;
};

// 3. Attendance heat map: the month as a calendar.
export const heatmapStory = (o: { bg?: CardBackground; eyebrow: string; title: string; weekdays: string[]; days: { day: number; inMonth: boolean; trained: boolean }[][]; stats: StoryStat[]; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title, o.bg);
    const gap = 18, cell = (W - PAD * 2 - gap * 6) / 7;
    o.weekdays.forEach((w, i) => text(ctx, w, PAD + i * (cell + gap) + cell / 2, 560, { size: 30, weight: 700, color: 'rgba(255,255,255,0.45)', align: 'center' }));
    o.days.forEach((week, r) => week.forEach((d, i) => {
        const x = PAD + i * (cell + gap), y = 600 + r * (cell + gap);
        roundRect(ctx, x, y, cell, cell, 28);
        ctx.fillStyle = !d.inMonth ? 'rgba(255,255,255,0.02)' : d.trained ? ORANGE : boxFill.startsWith('rgba(255') ? 'rgba(255,255,255,0.07)' : boxFill;
        ctx.fill();
        if (d.inMonth) text(ctx, String(d.day), x + cell / 2, y + cell / 2 + 14, { size: 38, weight: d.trained ? 800 : 500, align: 'center', color: d.trained ? INK : 'rgba(255,255,255,0.5)' });
    }));
    statsRow(ctx, o.stats, 600 + o.days.length * (cell + gap) + 60);
    footer(ctx, o.footer);
    return canvas;
};

// Before/after: two photos side by side, stacked, or one over the other with
// a divider, with labels and the logo as a watermark.
export type CompareLayout = 'side' | 'stack' | 'overlay';
export interface ComparePhoto { image: CanvasImageSource & { width: number; height: number }; label: string; note?: string }

const cover = (ctx: CanvasRenderingContext2D, img: ComparePhoto['image'], x: number, y: number, w: number, h: number) => {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
};

const label = (ctx: CanvasRenderingContext2D, p: ComparePhoto, x: number, y: number, align: 'left' | 'right') => {
    font(ctx, 800, 40);
    const w1 = ctx.measureText(p.label.toUpperCase()).width;
    font(ctx, 600, 30);
    const w2 = p.note ? ctx.measureText(p.note).width : 0;
    const w = Math.max(w1, w2) + 56, h = p.note ? 118 : 74;
    const left = align === 'left' ? x : x - w;
    roundRect(ctx, left, y, w, h, 24);
    ctx.fillStyle = 'rgba(11,13,16,0.72)';
    ctx.fill();
    text(ctx, p.label.toUpperCase(), left + 28, y + 52, { size: 40, weight: 800, color: '#ffffff' });
    if (p.note) text(ctx, p.note, left + 28, y + 96, { size: 30, weight: 600, color: 'rgba(255,255,255,0.75)' });
};

const watermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    font(ctx, 800, 30);
    const tw = 56 + 22 + ctx.measureText(BRAND).width + 44;
    roundRect(ctx, (w - tw) / 2, h - 110, tw, 76, 38);
    ctx.fillStyle = 'rgba(11,13,16,0.72)';
    ctx.fill();
    drawLogo(ctx, w / 2, h - 100, 56, { align: 'center' });
};

export const compareImage = (before: ComparePhoto, after: ComparePhoto, layout: CompareLayout, split = 0.5) => {
    const w = 1080, h = layout === 'stack' ? 1920 : 1350;
    const { canvas, ctx } = newCanvas(w, h);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    if (layout === 'side') {
        cover(ctx, before.image, 0, 0, w / 2 - 4, h);
        cover(ctx, after.image, w / 2 + 4, 0, w / 2 - 4, h);
        label(ctx, before, 32, 32, 'left');
        label(ctx, after, w / 2 + 36, 32, 'left');
    } else if (layout === 'stack') {
        cover(ctx, before.image, 0, 0, w, h / 2 - 4);
        cover(ctx, after.image, 0, h / 2 + 4, w, h / 2 - 4);
        label(ctx, before, 32, 32, 'left');
        label(ctx, after, 32, h / 2 + 36, 'left');
    } else {
        const x = Math.round(w * Math.min(0.95, Math.max(0.05, split)));
        cover(ctx, after.image, 0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, x, h);
        ctx.clip();
        cover(ctx, before.image, 0, 0, w, h);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 3, 0, 6, h);
        ctx.beginPath();
        ctx.arc(x, h / 2, 36, 0, Math.PI * 2);
        ctx.fillStyle = ORANGE;
        ctx.fill();
        text(ctx, '‹ ›', x, h / 2 + 14, { size: 40, weight: 800, align: 'center', color: '#ffffff' });
        label(ctx, before, 32, 32, 'left');
        label(ctx, after, w - 32, 32, 'right');
    }
    watermark(ctx, w, h);
    return canvas;
};

export const canvasBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'));

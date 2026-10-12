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

// The app icon (a dumbbell) and the name.
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
    for (const [rx, ry, rw, rh, rr] of [[96, 196, 40, 120, 14], [144, 164, 44, 184, 16], [324, 164, 44, 184, 16], [376, 196, 40, 120, 14], [188, 236, 136, 40, 10]]) {
        roundRect(ctx, left + rx * s, y + ry * s, rw * s, rh * s, rr * s);
        ctx.fill();
    }
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

const W = 1080, H = 1920, PAD = 90;

const storyFrame = (eyebrow: string, title: string) => {
    const { canvas, ctx } = newCanvas(W, H);
    darkBackground(ctx, W, H);
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
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();
        text(ctx, s.value, x + colW / 2, y + 112, { size: 64, weight: 800, align: 'center', maxWidth: colW - 40 });
        text(ctx, s.label, x + colW / 2, y + 168, { size: 30, weight: 500, color: 'rgba(255,255,255,0.6)', align: 'center', maxWidth: colW - 40 });
    });
};

const footer = (ctx: CanvasRenderingContext2D, line: string) => {
    text(ctx, line, W / 2, H - 110, { size: 32, weight: 500, color: 'rgba(255,255,255,0.45)', align: 'center' });
};

// 1. Weight lifted this month, and what it compares to.
export const volumeStory = (o: { eyebrow: string; title: string; big: string; bigLabel: string; emoji?: string; equivalence?: string; stats: StoryStat[]; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title);
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
export const recordsStory = (o: { eyebrow: string; title: string; rows: { name: string; value: string; badge?: string }[]; empty: string; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title);
    let y = 560;
    if (!o.rows.length) paragraph(ctx, o.empty, W / 2, 900, W - PAD * 2, { size: 52, weight: 700, align: 'center' });
    o.rows.forEach((r, i) => {
        roundRect(ctx, PAD, y, W - PAD * 2, 190, 40);
        const g = ctx.createLinearGradient(PAD, y, W - PAD, y);
        g.addColorStop(0, i === 0 ? 'rgba(242,107,29,0.35)' : 'rgba(255,255,255,0.08)');
        g.addColorStop(1, 'rgba(255,255,255,0.04)');
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
export const heatmapStory = (o: { eyebrow: string; title: string; weekdays: string[]; days: { day: number; inMonth: boolean; trained: boolean }[][]; stats: StoryStat[]; footer: string }) => {
    const { canvas, ctx } = storyFrame(o.eyebrow, o.title);
    const gap = 18, cell = (W - PAD * 2 - gap * 6) / 7;
    o.weekdays.forEach((w, i) => text(ctx, w, PAD + i * (cell + gap) + cell / 2, 560, { size: 30, weight: 700, color: 'rgba(255,255,255,0.45)', align: 'center' }));
    o.days.forEach((week, r) => week.forEach((d, i) => {
        const x = PAD + i * (cell + gap), y = 600 + r * (cell + gap);
        roundRect(ctx, x, y, cell, cell, 28);
        ctx.fillStyle = !d.inMonth ? 'rgba(255,255,255,0.02)' : d.trained ? ORANGE : 'rgba(255,255,255,0.07)';
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

/** Recetas de los efectos de sonido y la música tropical. */
import { noise, render, tone } from './synth';

export type SfxName =
  | 'tap' | 'roll' | 'land' | 'step' | 'capture' | 'crown' | 'jail' | 'triple'
  | 'soplo' | 'coin' | 'pair' | 'turn' | 'win' | 'lose' | 'exit' | 'levelup' | 'spin';

const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const RECIPES: Record<SfxName, [number, Parameters<typeof render>[1]]> = {
  tap: [0.12, (c) => tone(c, 0, 700, 0.06, 'sine', 0.25, 1100)],
  roll: [0.7, (c) => {
    for (let i = 0; i < 11; i++) noise(c, i * 0.055 + Math.random() * 0.02, 0.035, 0.35, 2500 + Math.random() * 1500, 'bandpass', undefined, 3);
  }],
  land: [0.3, (c) => { tone(c, 0, 160, 0.12, 'sine', 0.5, 70); noise(c, 0, 0.05, 0.3, 3000, 'bandpass', undefined, 2); noise(c, 0.08, 0.04, 0.2, 3500, 'bandpass', undefined, 2); }],
  step: [0.15, (c) => tone(c, 0, 520, 0.07, 'triangle', 0.22, 820)],
  capture: [0.9, (c) => {
    noise(c, 0, 0.35, 0.35, 400, 'bandpass', 4000, 1.2);
    tone(c, 0.12, 180, 0.5, 'sawtooth', 0.25, 50);
    tone(c, 0.12, 90, 0.6, 'sine', 0.5, 40);
    [N(84), N(88), N(91)].forEach((f, i) => tone(c, 0.2 + i * 0.05, f, 0.2, 'triangle', 0.12));
  }],
  crown: [1.1, (c) => {
    [N(72), N(76), N(79), N(84)].forEach((f, i) => tone(c, i * 0.09, f, 0.5, 'triangle', 0.22));
    tone(c, 0.36, N(88), 0.7, 'sine', 0.18);
  }],
  jail: [1.5, (c) => {
    [N(67), N(66), N(65)].forEach((f, i) => tone(c, i * 0.3, f, 0.25, 'sawtooth', 0.12, f * 0.98));
    tone(c, 0.9, N(64), 0.6, 'sawtooth', 0.14, N(60));
  }],
  triple: [1.4, (c) => {
    for (let i = 0; i < 6; i++) tone(c, i * 0.2, i % 2 ? 660 : 880, 0.16, 'square', 0.12);
    tone(c, 1.1, 110, 0.3, 'sawtooth', 0.25, 55);
  }],
  soplo: [0.9, (c) => { noise(c, 0, 0.75, 0.45, 300, 'bandpass', 3500, 0.8); tone(c, 0.5, N(79), 0.2, 'triangle', 0.15, N(84)); }],
  coin: [0.4, (c) => { tone(c, 0, N(83), 0.08, 'square', 0.12); tone(c, 0.07, N(88), 0.28, 'square', 0.12); }],
  pair: [0.6, (c) => [N(84), N(88), N(91), N(96)].forEach((f, i) => tone(c, i * 0.05, f, 0.25, 'sine', 0.15))],
  turn: [0.6, (c) => { tone(c, 0, N(76), 0.45, 'sine', 0.18); tone(c, 0, N(88), 0.3, 'sine', 0.06); }],
  win: [2.4, (c) => {
    const notes = [67, 72, 76, 79, 76, 79, 84];
    notes.forEach((n, i) => tone(c, i * 0.14, N(n), i === notes.length - 1 ? 1.2 : 0.2, 'triangle', 0.22));
    [72, 76, 79].forEach((n) => tone(c, 0.98, N(n), 1.2, 'sine', 0.1));
    for (let i = 0; i < 8; i++) noise(c, i * 0.14, 0.05, 0.12, 6000, 'highpass');
  }],
  lose: [1.3, (c) => [N(72), N(69), N(65), N(64)].forEach((f, i) => tone(c, i * 0.22, f, 0.35, 'triangle', 0.18))],
  exit: [0.5, (c) => { tone(c, 0, 260, 0.3, 'triangle', 0.25, 900); noise(c, 0.05, 0.2, 0.15, 2000, 'highpass'); }],
  levelup: [1.6, (c) => {
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(c, i * 0.07, N(n), 0.35, 'square', 0.08));
    tone(c, 0.55, N(84), 0.9, 'triangle', 0.2);
  }],
  spin: [0.12, (c) => noise(c, 0, 0.05, 0.3, 3000, 'bandpass', undefined, 4)],
};

/**
 * Música tropical suave (aire de cumbia): bajo, tambora, guacharaca y marimba.
 * 8 compases a 96 bpm que se repiten en bucle.
 */
export function musicLoop(): Promise<string> {
  const bpm = 96;
  const beat = 60 / bpm;
  const bars = 8;
  const total = bars * 4 * beat;
  // Progresión I - V - V - I - IV - I - V - I en Do mayor.
  const chords = [[48, 52, 55], [43, 47, 50], [43, 47, 50], [48, 52, 55], [41, 45, 48], [48, 52, 55], [43, 47, 50], [48, 52, 55]];
  const melody = [76, 79, 81, 79, 76, 74, 72, 74, 74, 77, 79, 77, 74, 72, 71, 72, 76, 79, 81, 84, 81, 79, 76, 79, 77, 76, 74, 72, 74, 71, 72, -1];
  return render(total + 0.5, (c) => {
    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4 * beat;
      const ch = chords[bar]!;
      // Bajo (tiempos 1 y 3: fundamental y quinta).
      tone(c, t0, N(ch[0]! - 12), beat * 0.9, 'triangle', 0.22);
      tone(c, t0 + 2 * beat, N(ch[2]! - 12), beat * 0.9, 'triangle', 0.18);
      for (let b = 0; b < 4; b++) {
        const tb = t0 + b * beat;
        // Tambora: golpe grave en 2 y 4, repique suave.
        if (b % 2 === 1) tone(c, tb, 95, 0.18, 'sine', 0.28, 55);
        tone(c, tb + beat * 0.75, 140, 0.08, 'sine', 0.08, 90);
        // Guacharaca: chiki-cha.
        noise(c, tb, 0.06, 0.05, 6000, 'highpass');
        noise(c, tb + beat * 0.5, 0.12, 0.09, 5000, 'highpass');
        noise(c, tb + beat * 0.75, 0.05, 0.04, 6500, 'highpass');
        // Acordes en contratiempo (acordeón suave).
        ch.forEach((n) => tone(c, tb + beat * 0.5, N(n + 12), beat * 0.35, 'triangle', 0.025, undefined, 0.02));
      }
      // Marimba: 4 notas por compás.
      for (let k = 0; k < 4; k++) {
        const n = melody[(bar * 4 + k) % melody.length]!;
        if (n < 0) continue;
        const tm = t0 + k * beat;
        tone(c, tm, N(n), 0.35, 'sine', 0.09);
        tone(c, tm, N(n) * 4, 0.08, 'sine', 0.02);
      }
    }
  });
}

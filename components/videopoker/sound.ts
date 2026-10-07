// Sonidos cortos generados con Web Audio (sin archivos de audio).
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'square', gain = 0.05) {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  } catch {
    // Audio no disponible: se ignora.
  }
}

export type SoundName = 'deal' | 'hold' | 'win' | 'bigWin' | 'bet';

export function playSound(name: SoundName) {
  switch (name) {
    case 'deal':
      return tone(320, 0, 0.05, 'triangle', 0.06);
    case 'hold':
      return tone(660, 0, 0.06, 'square', 0.04);
    case 'bet':
      return tone(520, 0, 0.05, 'square', 0.04);
    case 'win':
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.12));
      return;
    case 'bigWin':
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.16));
      return;
  }
}

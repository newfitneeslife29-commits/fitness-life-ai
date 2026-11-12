/**
 * Sintetizador: genera efectos y música con OfflineAudioContext y los convierte a WAV
 * (sin archivos de audio externos). Howler reproduce el resultado.
 */
const RATE = 22050;

type Ctx = OfflineAudioContext;

function env(ctx: Ctx, g: GainNode, t: number, a: number, d: number, peak: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export function tone(ctx: Ctx, t: number, freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, slideTo?: number, attack = 0.005) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(ctx, g, t, attack, dur, gain);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(ctx: Ctx): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
}

export function noise(ctx: Ctx, t: number, dur: number, gain = 0.3, freq = 2000, type: BiquadFilterType = 'bandpass', sweepTo?: number, q = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  env(ctx, g, t, 0.004, dur, gain);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

export async function render(seconds: number, draw: (ctx: Ctx) => void): Promise<string> {
  const ctx = new OfflineAudioContext(1, Math.ceil(RATE * seconds), RATE);
  draw(ctx);
  const buf = await ctx.startRendering();
  return URL.createObjectURL(toWav(buf));
}

function toWav(buf: AudioBuffer): Blob {
  const data = buf.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  out.setUint32(4, 36 + data.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  w(36, 'data');
  out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]!));
    out.setInt16(44 + i * 2, v * 0x7fff, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}

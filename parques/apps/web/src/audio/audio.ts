/** Reproducción con Howler.js respetando los ajustes (sonido, música, vibración). */
import { Howl, Howler } from 'howler';
import { RECIPES, musicLoop, type SfxName } from './sounds';
import { render } from './synth';
import { useSettings } from '../stores/settingsStore';
import { hapticVibrate } from '../lib/native';

const sfx = new Map<SfxName, Howl>();
let music: Howl | null = null;
let loading: Promise<void> | null = null;

/** Genera todos los sonidos (una vez). Se llama desde la pantalla de carga. */
export function loadAudio(onProgress?: (p: number) => void): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (typeof OfflineAudioContext === 'undefined') return;
    const names = Object.keys(RECIPES) as SfxName[];
    let done = 0;
    for (const name of names) {
      try {
        const [secs, draw] = RECIPES[name];
        const url = await render(secs, draw);
        sfx.set(name, new Howl({ src: [url], format: ['wav'], volume: 0.7 }));
      } catch {
        /* sin audio: el juego sigue */
      }
      onProgress?.(++done / (names.length + 1));
    }
    try {
      const url = await musicLoop();
      music = new Howl({ src: [url], format: ['wav'], loop: true, volume: 0 });
    } catch {
      music = null;
    }
    onProgress?.(1);
    syncMusic();
  })();
  return loading;
}

export function play(name: SfxName, rate = 1) {
  if (!useSettings.getState().sound) return;
  const h = sfx.get(name);
  if (!h) return;
  const id = h.play();
  if (rate !== 1) h.rate(rate, id);
}

export function vibrate(pattern: number | number[]) {
  if (useSettings.getState().vibration) void hapticVibrate(pattern);
}

/** Enciende o apaga la música según los ajustes (con fundido). */
export function syncMusic() {
  if (!music) return;
  const on = useSettings.getState().music;
  if (on) {
    if (!music.playing()) music.play();
    music.fade(music.volume(), 0.35, 800);
  } else if (music.playing()) {
    music.fade(music.volume(), 0, 400);
    const m = music;
    setTimeout(() => m.volume() === 0 && m.pause(), 450);
  }
}

useSettings.subscribe(() => {
  syncMusic();
  Howler.mute(false);
});

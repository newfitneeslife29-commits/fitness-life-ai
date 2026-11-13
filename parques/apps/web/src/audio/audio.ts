/**
 * Reproducción con Howler.js respetando los ajustes (sonido, música, vibración).
 * Efectos y música grabados (public/sfx, public/music); si un archivo no carga se usa el sonido sintetizado.
 */
import { Howl, Howler } from 'howler';
import { RECIPES, musicLoop, type SfxName } from './sounds';
import { render } from './synth';
import { useSettings } from '../stores/settingsStore';
import { hapticVibrate } from '../lib/native';

/** Efectos con archivo propio en public/sfx/<nombre>.mp3 (el resto, sintetizados). */
export const FILE_SFX: SfxName[] = ['tap', 'step', 'capture', 'crown', 'jail', 'soplo', 'coin', 'pair', 'turn', 'win', 'lose', 'exit', 'levelup'];
/** Volumen de cada efecto grabado (los cortos y repetidos, más suaves). */
const VOL: Partial<Record<SfxName, number>> = { tap: 0.45, step: 0.4, turn: 0.55, coin: 0.6, roll: 0.8, win: 0.8 };

export type MusicTrack = 'lobby' | 'game';

const sfx = new Map<SfxName, Howl>();
const tracks = new Map<MusicTrack, Howl>();
let current: MusicTrack = 'lobby';
let loading: Promise<void> | null = null;

function loadFile(src: string, opts: { volume: number; loop?: boolean; html5?: boolean }): Promise<Howl | null> {
  return new Promise((resolve) => {
    const h = new Howl({ src: [src], ...opts, preload: true });
    const t = setTimeout(() => resolve(h.state() === 'loaded' ? h : null), 8000);
    h.once('load', () => { clearTimeout(t); resolve(h); });
    h.once('loaderror', () => { clearTimeout(t); resolve(null); });
  });
}

async function synth(name: SfxName): Promise<Howl | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;
  try {
    const [secs, draw] = RECIPES[name];
    return new Howl({ src: [await render(secs, draw)], format: ['wav'], volume: 0.7 });
  } catch {
    return null;
  }
}

/** Carga todos los sonidos (una vez). Se llama desde la pantalla de carga. */
export function loadAudio(onProgress?: (p: number) => void): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const names = Object.keys(RECIPES) as SfxName[];
    let done = 0;
    const total = names.length + 1;
    await Promise.all(
      names.map(async (name) => {
        let h: Howl | null = null;
        if (FILE_SFX.includes(name)) h = await loadFile(`sfx/${name}.mp3`, { volume: VOL[name] ?? 0.7 });
        if (!h) h = await synth(name);
        if (h) sfx.set(name, h);
        onProgress?.(++done / total);
      }),
    );
    // Música: la del menú primero (la de la partida se carga en segundo plano). html5 = no se decodifica todo en memoria.
    const lobby = await loadFile('music/lobby.mp3', { volume: 0, loop: true, html5: true });
    if (lobby) tracks.set('lobby', lobby);
    else {
      try {
        tracks.set('lobby', new Howl({ src: [await musicLoop()], format: ['wav'], loop: true, volume: 0 }));
      } catch {
        /* sin música */
      }
    }
    onProgress?.(1);
    syncMusic();
    void loadFile('music/game.mp3', { volume: 0, loop: true, html5: true }).then((g) => {
      if (g) tracks.set('game', g);
      syncMusic();
    });
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

/** Cambia la canción (menú ↔ partida) con fundido cruzado. */
export function setMusicTrack(track: MusicTrack) {
  if (track === current) return;
  current = track;
  syncMusic();
}

const MUSIC_VOL: Record<MusicTrack, number> = { lobby: 0.32, game: 0.22 };

/** Enciende o apaga la música según los ajustes (con fundido). */
export function syncMusic() {
  const on = useSettings.getState().music;
  const want = tracks.get(current) ?? tracks.get('lobby');
  for (const h of tracks.values()) {
    if (h !== want || !on) {
      if (h.playing()) {
        h.fade(h.volume(), 0, 500);
        setTimeout(() => h.volume() === 0 && h.pause(), 550);
      }
    }
  }
  if (on && want) {
    if (!want.playing()) want.play();
    want.fade(want.volume(), MUSIC_VOL[want === tracks.get('game') ? 'game' : 'lobby'], 900);
  }
}

useSettings.subscribe(() => {
  syncMusic();
  Howler.mute(false);
});

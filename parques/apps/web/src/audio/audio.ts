/**
 * Reproducción con Howler.js respetando los ajustes (sonido, música, vibración).
 * Efectos y música grabados (public/sfx, public/music); si un archivo no carga se usa el sonido sintetizado.
 * La música se pausa cuando la app pasa a segundo plano y vuelve al regresar.
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

export { MUSIC_TRACKS } from '../game/tutorialData';

export type MusicScene = 'lobby' | 'game';

const sfx = new Map<SfxName, Howl>();
const tracks = new Map<string, Howl | null>();
let scene: MusicScene = 'lobby';
let hidden = false;
let loading: Promise<void> | null = null;

/** iPhone: que el juego suene aunque el interruptor de silencio esté activado (Safari 16.4+). */
function setPlaybackSession() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* no disponible */
  }
}

function loadFile(src: string, opts: { volume: number; loop?: boolean; html5?: boolean }): Promise<Howl | null> {
  return new Promise((resolve) => {
    const h = new Howl({ src: [src], ...opts, preload: true });
    const t = setTimeout(() => resolve(h.state() === 'loaded' ? h : null), 8000);
    h.once('load', () => {
      clearTimeout(t);
      resolve(h);
    });
    h.once('loaderror', () => {
      clearTimeout(t);
      resolve(null);
    });
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

/** Carga (una vez) la canción `id`; si no hay archivo usa la música sintetizada. */
async function loadTrack(id: string): Promise<Howl | null> {
  if (tracks.has(id)) return tracks.get(id) ?? null;
  tracks.set(id, null);
  let h = await loadFile(`music/${id}.mp3`, { volume: 0, loop: true, html5: true });
  if (!h && id === 'lobby') {
    try {
      h = new Howl({ src: [await musicLoop()], format: ['wav'], loop: true, volume: 0 });
    } catch {
      h = null;
    }
  }
  tracks.set(id, h);
  return h;
}

/** Carga todos los sonidos (una vez). Se llama desde la pantalla de carga. */
export function loadAudio(onProgress?: (p: number) => void): Promise<void> {
  if (loading) return loading;
  setPlaybackSession();
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
    await loadTrack(wantedTrack());
    onProgress?.(1);
    syncMusic();
  })();
  return loading;
}

export function play(name: SfxName, rate = 1) {
  if (!useSettings.getState().sound || hidden) return;
  setPlaybackSession();
  const h = sfx.get(name);
  if (!h) return;
  const id = h.play();
  if (rate !== 1) h.rate(rate, id);
}

export function vibrate(pattern: number | number[]) {
  if (useSettings.getState().vibration) void hapticVibrate(pattern);
}

/** Pantalla actual (menú o partida): con música automática cambia la canción. */
export function setMusicTrack(next: MusicScene) {
  if (next === scene) return;
  scene = next;
  syncMusic();
}

function wantedTrack(): string {
  const pick = useSettings.getState().musicTrack || 'auto';
  return pick === 'auto' ? scene : pick;
}

const MUSIC_VOL = (id: string) => (id === 'game' || scene === 'game' ? 0.22 : 0.32);

/** Enciende, apaga o cambia la música según los ajustes y si la app está visible (con fundido). */
export function syncMusic() {
  const on = useSettings.getState().music && !hidden;
  const id = wantedTrack();
  const want = tracks.get(id) ?? null;
  for (const [tid, h] of tracks) {
    if (!h) continue;
    if (tid !== id || !on) {
      if (h.playing()) {
        h.fade(h.volume(), 0, hidden ? 120 : 500);
        setTimeout(() => h.volume() === 0 && h.pause(), hidden ? 150 : 550);
      }
    }
  }
  if (!on) return;
  if (!tracks.has(id)) {
    void loadTrack(id).then(() => syncMusic());
    return;
  }
  if (want) {
    if (!want.playing()) want.play();
    want.fade(want.volume(), MUSIC_VOL(id), 900);
  }
}

/** La app pasa a segundo plano o vuelve: la música (y los efectos) se callan o regresan. */
export function setAppHidden(h: boolean) {
  if (hidden === h) return;
  hidden = h;
  if (h) {
    for (const t of tracks.values()) t?.pause();
    Howler.mute(true);
  } else {
    Howler.mute(false);
    setPlaybackSession();
    syncMusic();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setAppHidden(document.visibilityState === 'hidden'));
  window.addEventListener('pagehide', () => setAppHidden(true));
  window.addEventListener('pageshow', () => setAppHidden(false));
}

useSettings.subscribe(() => {
  syncMusic();
  if (!hidden) Howler.mute(false);
});

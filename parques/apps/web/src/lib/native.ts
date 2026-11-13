/**
 * Integración con las apps nativas (iOS/Android vía Capacitor): barra de estado,
 * pantalla de inicio, botón "atrás" de Android y vibración háptica.
 * En el navegador estas funciones no hacen nada.
 */
import { Capacitor } from '@capacitor/core';
import { useApp } from '../stores/appStore';
import { useGame } from '../stores/gameStore';

export const isNative = () => Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative()) return;
  document.documentElement.classList.add('native', `native-${Capacitor.getPlatform()}`);
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* sin barra de estado */
  }
  setTimeout(() => SplashScreen.hide().catch(() => undefined), 300);

  // App en segundo plano (botón de inicio, otra app, pantalla apagada): se calla la música.
  App.addListener('appStateChange', ({ isActive }) => {
    void import('../audio/audio').then((m) => m.setAppHidden(!isActive));
  });

  // Botón "atrás" de Android: vuelve al lobby; en el lobby minimiza la app.
  App.addListener('backButton', () => {
    const { screen, go } = useApp.getState();
    if (screen === 'lobby' || screen === 'splash') {
      App.minimizeApp().catch(() => undefined);
    } else if (screen === 'game') {
      // En partida no se sale por accidente: se abre el menú de pausa del juego.
      document.querySelector<HTMLButtonElement>('.game-top .btn3d')?.click();
    } else if (screen === 'victory') {
      useGame.getState().quit();
      go('lobby');
    } else go('lobby');
  });
}

/** Vibración: háptica nativa en iOS/Android, navigator.vibrate en la web. */
export async function hapticVibrate(pattern: number | number[]) {
  if (isNative()) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const strong = Array.isArray(pattern) || pattern >= 80;
    Haptics.impact({ style: strong ? ImpactStyle.Heavy : ImpactStyle.Medium }).catch(() => undefined);
    return;
  }
  navigator.vibrate?.(pattern);
}

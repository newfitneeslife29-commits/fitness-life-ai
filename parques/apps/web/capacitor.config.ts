import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Apps nativas de Parqués (iOS y Android) con Capacitor.
 * La app usa la misma web compilada (dist) y se conecta al servidor online
 * definido en VITE_SERVER_URL al compilar (ver README / CLAUDE.md).
 */
const config: CapacitorConfig = {
  appId: 'co.parques.app',
  appName: 'Parqués',
  webDir: 'dist',
  backgroundColor: '#120c2e',
  android: {
    backgroundColor: '#120c2e',
  },
  ios: {
    backgroundColor: '#120c2e',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#120c2e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
  },
};

export default config;

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Everything the app needs is bundled: no CDNs, no API keys, no backend.
// `base: './'` lets the same build run from any folder (GitHub Pages, Netlify, a phone).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by hand in main.tsx, and only on the web: inside the
      // iOS/Android apps a service worker would only serve stale files.
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fitness Life',
        short_name: 'Fitness Life',
        description: 'Tu plan de fuerza, tus series y tu progreso. Funciona sin conexión.',
        lang: 'es',
        theme_color: '#0b0d10',
        background_color: '#0b0d10',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, host: '0.0.0.0' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

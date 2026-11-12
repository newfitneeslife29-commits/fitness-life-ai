import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El service worker se registra a mano solo en la web (no dentro de las apps nativas).
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Parqués',
        short_name: 'Parqués',
        description: 'Parqués colombiano: juega contra la máquina o con amigos en el mismo celular.',
        lang: 'es-CO',
        theme_color: '#1b1340',
        background_color: '#120c2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // En desarrollo el cliente habla con el servidor online por el mismo puerto.
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true }, '/api': 'http://localhost:3001' },
  },
  preview: { proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true }, '/api': 'http://localhost:3001' } },
});

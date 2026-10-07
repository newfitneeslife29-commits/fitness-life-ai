/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Secrets (Gemini, Stripe) must never be injected here: anything in `define`
// or prefixed with VITE_ ends up in the public bundle. They live as Supabase
// Edge Function secrets instead (see supabase/functions).
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});

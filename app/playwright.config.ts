import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    ...devices['Pixel 7'],
    // The app follows the phone's language; most tests run in Spanish.
    locale: 'es-ES',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4321 --strictPort',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Point the AI coach at a fake backend that the tests answer themselves.
    env: { VITE_SUPABASE_URL: 'http://ai.test', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
});

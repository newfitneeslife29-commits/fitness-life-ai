import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    ...devices['Pixel 7'],
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4321 --strictPort',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

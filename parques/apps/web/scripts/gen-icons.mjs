// Genera los íconos PNG de la PWA a partir de public/icon.svg (diseño original, sin imágenes externas).
// Uso: npm run icons  (requiere Playwright + Chromium)
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = readFileSync(fileURLToPath(new URL('../public/icon.svg', import.meta.url)), 'utf8');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#0b2a86;display:grid;place-items:center"><div style="width:${size * 0.82}px;height:${size * 0.82}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div>`
    : svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
  await page.screenshot({ path: out + name, omitBackground: !maskable });
}
await browser.close();
console.log('Íconos generados en public/icons');

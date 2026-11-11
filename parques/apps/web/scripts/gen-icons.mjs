// Genera los íconos PNG de la PWA a partir de un SVG original (sin imágenes externas).
// Uso: npm run icons  (requiere Playwright + Chromium)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(out, { recursive: true });

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#3a1f86"/><stop offset="1" stop-color="#120c2e"/></radialGradient>
  </defs>
  <rect width="512" height="512" ${pad ? '' : 'rx="110"'} fill="url(#bg)"/>
  <g transform="translate(256 280) scale(${pad ? 0.72 : 0.9})">
    <rect x="-150" y="-140" width="300" height="300" rx="62" fill="#fff8ec" stroke="#2a1400" stroke-width="16"/>
    <circle cx="-70" cy="-60" r="30" fill="#ff3b4e"/><circle cx="70" cy="-60" r="30" fill="#2f7bff"/>
    <circle cx="0" cy="10" r="30" fill="#2a1400"/>
    <circle cx="-70" cy="80" r="30" fill="#22c55e"/><circle cx="70" cy="80" r="30" fill="#ffc928"/>
    <g transform="translate(0 -150) rotate(-8)">
      <ellipse cx="0" cy="18" rx="150" ry="46" fill="#f4e3c1" stroke="#2a1400" stroke-width="12"/>
      <ellipse cx="0" cy="18" rx="108" ry="30" fill="none" stroke="#2a1400" stroke-width="9" stroke-dasharray="16 10"/>
      <path d="M-70 14 Q-64 -84 0 -88 Q64 -84 70 14 Z" fill="#f4e3c1" stroke="#2a1400" stroke-width="12"/>
      <path d="M-64 -22 Q0 -2 64 -22" fill="none" stroke="#2a1400" stroke-width="16"/>
    </g>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out + name, omitBackground: true });
}
await browser.close();
console.log('Íconos generados en public/icons');

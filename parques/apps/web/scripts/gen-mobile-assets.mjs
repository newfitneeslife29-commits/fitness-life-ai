// Genera íconos y pantallas de inicio de las apps iOS/Android desde public/icon.svg.
// Reemplaza cada PNG existente de los proyectos nativos conservando su tamaño.
// Uso: npm run assets:mobile   (requiere Playwright + Chromium)
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const svg = readFileSync(join(root, 'public/icon.svg'), 'utf8');
const BG = '#120c2e';

function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.png')) out.push(p);
  }
  return out;
}

const inner = (pct) => `<div style="width:${pct}%;height:${pct}%">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>`;
const html = {
  // Ícono completo (Android ic_launcher / ic_launcher_round).
  icon: `<div style="width:100%;height:100%;display:grid;place-items:center">${inner(100)}</div>`,
  // iOS: cuadrado sin transparencia (iOS redondea las esquinas).
  ios: `<div style="width:100%;height:100%;background:#0b2a86;display:grid;place-items:center">${inner(88)}</div>`,
  // Android adaptativo: primer plano dentro de la zona segura (66 %).
  foreground: `<div style="width:100%;height:100%;display:grid;place-items:center">${inner(64)}</div>`,
  splash: `<div style="width:100%;height:100%;background:radial-gradient(circle at 50% 35%, #3a1f86, ${BG} 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vmin">
    <div style="width:34vmin;height:34vmin">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    <div style="font:800 8vmin 'Arial Black',sans-serif;letter-spacing:.02em">
      <span style="color:#ffc928">P</span><span style="color:#ff3b4e">A</span><span style="color:#22c55e">R</span><span style="color:#2f7bff">Q</span><span style="color:#ffc928">U</span><span style="color:#ff3b4e">É</span><span style="color:#22c55e">S</span>
    </div></div>`,
};

function kind(file) {
  if (file.includes('Splash.imageset') || /splash\.png$/.test(file)) return 'splash';
  if (file.includes('AppIcon')) return 'ios';
  if (file.endsWith('ic_launcher_foreground.png')) return 'foreground';
  return 'icon';
}

const files = [...walk(join(root, 'android/app/src/main/res')), ...walk(join(root, 'ios/App/App/Assets.xcassets'))];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  const { w, h } = pngSize(f);
  const k = kind(f);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent">${html[k]}</body></html>`);
  const buf = await page.screenshot({ omitBackground: k === 'icon' || k === 'foreground' });
  writeFileSync(f, buf);
}
await browser.close();

// Fondo del ícono adaptativo de Android.
const bgXml = join(root, 'android/app/src/main/res/values/ic_launcher_background.xml');
writeFileSync(bgXml, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B2A86</color>\n</resources>\n`);
console.log(`Listo: ${files.length} imágenes de iOS/Android`);

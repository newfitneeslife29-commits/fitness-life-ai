/**
 * Compartir un momento (v1.2): dibuja una tarjeta (PNG 1080×1350) con el resultado de la partida
 * y la comparte con la hoja nativa (WhatsApp, Instagram…) o la descarga en la web.
 */
import { Capacitor } from '@capacitor/core';
import { inviteUrl } from '@parques/engine';
import { serverUrl } from './online';
import { tr } from './i18n';

export interface MomentInfo {
  title: string;
  subtitle: string;
  name: string;
  avatar: string;
  stats: { icon: string; label: string; value: string }[];
  playerId: string;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dibuja la tarjeta y devuelve el PNG en base64 (sin el prefijo data:). */
export async function drawMoment(m: MomentInfo): Promise<string> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a0f5c');
  bg.addColorStop(0.55, '#7c1d6f');
  bg.addColorStop(1, '#f2a900');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Rayos de fiesta.
  ctx.save();
  ctx.translate(W / 2, 560);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,207,63,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-80, -900);
    ctx.lineTo(80, -900);
    ctx.fill();
  }
  ctx.restore();
  // Confeti.
  const colors = ['#ffcf3f', '#ff3b4e', '#2f7bff', '#22c55e', '#f472b6'];
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.save();
    ctx.translate((i * 137) % W, (i * 251) % H);
    ctx.rotate(i);
    ctx.fillRect(-9, -4, 18, 8);
    ctx.restore();
  }
  const [logo, mascot] = await Promise.all([loadImg('art/logo.webp'), loadImg('art/dadito-gana.webp')]);
  if (logo) ctx.drawImage(logo, W / 2 - 260, 40, 520, (520 * logo.height) / logo.width);
  if (mascot) ctx.drawImage(mascot, W / 2 - 220, 300, 440, (440 * mascot.height) / mascot.width);

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffe27a';
  ctx.font = '900 92px "Baloo 2", system-ui, sans-serif';
  ctx.fillText(m.title, W / 2, 860);
  ctx.fillStyle = '#fff';
  ctx.font = '800 46px Nunito, system-ui, sans-serif';
  ctx.fillText(`${m.avatar.length <= 4 ? m.avatar + ' ' : ''}${m.name} · ${m.subtitle}`, W / 2, 930);
  ctx.shadowBlur = 0;

  const n = m.stats.length;
  const bw = 300;
  const gap = 30;
  const x0 = W / 2 - (n * bw + (n - 1) * gap) / 2;
  m.stats.forEach((s, i) => {
    const x = x0 + i * (bw + gap);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    roundRect(ctx, x, 990, bw, 170, 30);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '900 64px Nunito, system-ui, sans-serif';
    ctx.fillText(`${s.icon} ${s.value}`, x + bw / 2, 1075);
    ctx.font = '700 32px Nunito, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(s.label, x + bw / 2, 1128);
  });
  ctx.fillStyle = '#fff';
  ctx.font = '800 38px Nunito, system-ui, sans-serif';
  ctx.fillText(tr('¡Juega conmigo! Mi código: {id}', { id: m.playerId }), W / 2, 1250);
  return c.toDataURL('image/png').split(',')[1]!;
}

/** Comparte la tarjeta del momento. Devuelve false si el usuario canceló o no se pudo. */
export async function shareMoment(m: MomentInfo): Promise<boolean> {
  const b64 = await drawMoment(m);
  const link = inviteUrl(serverUrl() || location.origin, m.playerId);
  const text = tr('¡Mira mi partida en Parqués Colombia! {url}', { url: link });
  try {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const file = await Filesystem.writeFile({ path: `parques-momento-${Date.now()}.png`, data: b64, directory: Directory.Cache });
      await Share.share({ title: 'Parqués Colombia', text, files: [file.uri] });
      return true;
    }
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const f = new File([bytes], 'parques-momento.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [f] })) {
      await nav.share({ files: [f], text });
      return true;
    }
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${b64}`;
    a.download = 'parques-momento.png';
    a.click();
    return true;
  } catch {
    return false;
  }
}

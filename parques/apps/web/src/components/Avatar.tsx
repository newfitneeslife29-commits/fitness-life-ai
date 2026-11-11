import { item } from '../meta/catalog';

/** Avatar con marco de la tienda. Muestra la foto del usuario si la subió (o si `emoji` es una foto). */
export function Avatar({ emoji, photo, frameId, size = 56, color, level, ring }: { emoji: string; photo?: string | null; frameId?: string; size?: number; color?: string; level?: number; ring?: number }) {
  const frame = item(frameId ?? 'frame-ninguno').frame!;
  const img = photo ?? (emoji.startsWith('data:image') ? emoji : null);
  return (
    <div className="avatar" style={{ width: size, height: size, ['--ring-a' as string]: frame.ring[0], ['--ring-b' as string]: frame.ring[1], ['--av' as string]: color ?? 'var(--azul)' }}>
      {ring !== undefined ? (
        <svg className="avatar-xp" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${113 * ring} 113`} transform="rotate(-90 20 20)" />
        </svg>
      ) : null}
      {img ? (
        <img className="avatar-face photo" src={img} alt="" draggable={false} />
      ) : (
        <div className="avatar-face" style={{ fontSize: size * 0.48 }}>{emoji}</div>
      )}
      {frame.ornament ? <span className="avatar-orn" style={{ fontSize: size * 0.28 }}>{frame.ornament}</span> : null}
      {level !== undefined ? <span className="avatar-lvl">{level}</span> : null}
    </div>
  );
}

/** Reduce una foto a 160×160 JPEG (≈10–20 KB) para guardarla y mandarla al servidor. */
export function photoToDataUrl(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let q = 0.82;
      let out = c.toDataURL('image/jpeg', q);
      while (out.length > 38000 && q > 0.4) {
        q -= 0.1;
        out = c.toDataURL('image/jpeg', q);
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}

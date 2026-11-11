import { item } from '../meta/catalog';

/** Avatar con marco de la tienda. */
export function Avatar({ emoji, frameId, size = 56, color, level, ring }: { emoji: string; frameId?: string; size?: number; color?: string; level?: number; ring?: number }) {
  const frame = item(frameId ?? 'frame-ninguno').frame!;
  return (
    <div className="avatar" style={{ width: size, height: size, ['--ring-a' as string]: frame.ring[0], ['--ring-b' as string]: frame.ring[1], ['--av' as string]: color ?? 'var(--azul)' }}>
      {ring !== undefined ? (
        <svg className="avatar-xp" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${113 * ring} 113`} transform="rotate(-90 20 20)" />
        </svg>
      ) : null}
      <div className="avatar-face" style={{ fontSize: size * 0.48 }}>{emoji}</div>
      {frame.ornament ? <span className="avatar-orn" style={{ fontSize: size * 0.28 }}>{frame.ornament}</span> : null}
      {level !== undefined ? <span className="avatar-lvl">{level}</span> : null}
    </div>
  );
}

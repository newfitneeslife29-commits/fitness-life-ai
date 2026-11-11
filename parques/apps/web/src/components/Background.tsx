import { memo } from 'react';

/** Fondo festivo: degradado con manchas de color y figuritas flotando (CSS puro, liviano). */
export const Background = memo(function Background({ tint }: { tint?: [string, string] }) {
  const floaters = ['🎲', '🌺', '⭐', '☕', '🎲', '🌴', '✨', '🦜', '🎲', '🌼'];
  return (
    <div className="bg" aria-hidden style={tint ? { ['--bg-a' as string]: tint[0], ['--bg-b' as string]: tint[1] } : undefined}>
      <div className="bg-blob b1" />
      <div className="bg-blob b2" />
      <div className="bg-blob b3" />
      <div className="bg-blob b4" />
      <div className="bg-rays" />
      {floaters.map((f, i) => (
        <span key={i} className="floater" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${16 + (i % 4) * 4}s`, fontSize: `${1 + (i % 3) * 0.5}rem` }}>
          {f}
        </span>
      ))}
    </div>
  );
});

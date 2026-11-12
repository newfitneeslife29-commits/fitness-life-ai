/** Gradientes SVG compartidos (fichas 3D) disponibles en toda la app. */
export function GlobalDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="pc-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,.45)" />
          <stop offset="28%" stopColor="rgba(255,255,255,.35)" />
          <stop offset="45%" stopColor="rgba(255,255,255,.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,.5)" />
        </linearGradient>
        <radialGradient id="pc-head" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
          <stop offset="30%" stopColor="rgba(255,255,255,.25)" />
          <stop offset="75%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,.4)" />
        </radialGradient>
        <radialGradient id="pieceShine" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
          <stop offset="35%" stopColor="rgba(255,255,255,.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

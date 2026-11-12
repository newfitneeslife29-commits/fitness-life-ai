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
        <radialGradient id="pc-pearl" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
          <stop offset="40%" stopColor="rgba(255,240,250,.5)" />
          <stop offset="70%" stopColor="rgba(190,220,255,.35)" />
          <stop offset="100%" stopColor="rgba(0,0,0,.15)" />
        </radialGradient>
        <linearGradient id="pc-matte" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,.35)" />
        </linearGradient>
        <linearGradient id="pc-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,60,0,.65)" />
          <stop offset="60%" stopColor="rgba(255,190,0,.35)" />
          <stop offset="100%" stopColor="rgba(255,255,180,.1)" />
        </linearGradient>
        <linearGradient id="pc-wind" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(224,242,254,.7)" />
          <stop offset="50%" stopColor="rgba(125,211,252,.2)" />
          <stop offset="100%" stopColor="rgba(14,116,144,.35)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

import { useEffect, useRef } from 'react';

/** Confeti en canvas (ligero para celulares de gama media). */
export function Confetti({ duration = 4500 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['#ffc928', '#2f7bff', '#ff3b4e', '#22c55e', '#ffffff', '#ff8a1f'];
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 2 * dpr,
      vy: (2 + Math.random() * 3) * dpr,
      r: (4 + Math.random() * 5) * dpr,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)]!,
    }));
    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = Math.max(0, 1 - Math.max(0, t - t0 - duration * 0.7) / (duration * 0.3));
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        if (p.y > canvas.height + 20 && t - t0 < duration * 0.6) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (t - t0 < duration) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [duration]);
  return <canvas ref={ref} className="confetti" />;
}

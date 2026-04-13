import { prefersReducedMotion } from './flags';

type InkParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  decay: number;
  gravity: number;
};

const INK_COLORS = [
  'rgba(30,58,95,', // #1E3A5F deep cobalt
  'rgba(90,122,148,', // #5A7A94 dusty blue
  'rgba(42,42,42,', // #2A2A2A charcoal
  'rgba(166,159,147,', // #A69F93 warm taupe
] as const;

class Splatter {
  private readonly particles: InkParticle[] = [];

  constructor(x: number, y: number) {
    const count = 8 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const size = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size,
        alpha: 0.4 + Math.random() * 0.4,
        color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)]!,
        decay: 0.008 + Math.random() * 0.012,
        gravity: 0.03 + Math.random() * 0.05,
      });
    }
  }

  update(ctx: CanvasRenderingContext2D): boolean {
    let alive = false;
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        ctx.beginPath();
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // Ink drip trail
        if (p.size > 2 && Math.random() < 0.3) {
          ctx.beginPath();
          ctx.fillStyle = `${p.color}${p.alpha * 0.3})`;
          ctx.arc(p.x - p.vx * 0.5, p.y - p.vy * 0.5, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return alive;
  }
}

export function initInkFx(): void {
  if (prefersReducedMotion) return;
  const canvasEl = document.getElementById('ink-fx');
  if (!canvasEl) return;
  const canvas = canvasEl as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = 0,
    h = 0;
  function resize(): void {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const splatters: Splatter[] = [];

  // Trigger splatters when each char animates (brush-wipe timing に同期)
  const chars = document.querySelectorAll('.hero-title .char');
  chars.forEach((char, i) => {
    const delay = 400 + i * 120;
    setTimeout(() => {
      const rect = char.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      splatters.push(new Splatter(cx, cy));
      // エッジ側の追加飛沫で筆感強化
      splatters.push(new Splatter(rect.right - 4, cy + (Math.random() - 0.5) * rect.height * 0.5));
    }, delay);
  });

  function animate(): void {
    ctx!.clearRect(0, 0, w, h);
    for (let i = splatters.length - 1; i >= 0; i--) {
      if (!splatters[i]!.update(ctx!)) splatters.splice(i, 1);
    }
    if (splatters.length > 0) {
      requestAnimationFrame(animate);
    } else {
      ctx!.clearRect(0, 0, w, h);
      canvas.style.display = 'none';
    }
  }
  requestAnimationFrame(animate);
}

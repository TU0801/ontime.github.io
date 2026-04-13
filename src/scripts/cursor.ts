import { isTouchDevice, prefersReducedMotion } from './flags';

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

export function initCustomCursor(): void {
  if (isTouchDevice || prefersReducedMotion) return;
  const cursor = document.getElementById('custom-cursor');
  const trail = document.getElementById('cursor-trail');
  if (!cursor || !trail) return;

  let cx = -100, cy = -100, tx = -100, ty = -100;
  let trX = -100, trY = -100;

  document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
  document.addEventListener('mouseenter', () => {
    cursor.classList.add('visible');
    trail.classList.add('visible');
  });
  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('visible');
    trail.classList.remove('visible');
  });

  const hoverSel = '.cta-btn, .bento-card, .logo, .close-btn, a, .case-preview';
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (target instanceof Element && target.closest(hoverSel)) {
      cursor.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    if (target instanceof Element && target.closest(hoverSel)) {
      cursor.classList.remove('hover');
    }
  });

  function tick(): void {
    cx = lerp(cx, tx, 0.25); cy = lerp(cy, ty, 0.25);
    cursor!.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    trX = lerp(trX, cx, 0.15); trY = lerp(trY, cy, 0.15);
    trail!.style.transform = `translate(${trX}px,${trY}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

type MagneticConfig = { readonly selector: string; readonly threshold: number; readonly max: number };
type MagneticItem = {
  el: HTMLElement;
  threshold: number;
  max: number;
  cx: number;
  cy: number;
};

export function initMagneticElements(): void {
  if (isTouchDevice || prefersReducedMotion) return;
  const config: readonly MagneticConfig[] = [
    { selector: '.cta-btn:not(.cta-btn-light)', threshold: 80, max: 8 },
    { selector: '.bento-card', threshold: 60, max: 5 },
  ];
  const items: MagneticItem[] = [];
  for (const { selector, threshold, max } of config) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      items.push({ el, threshold, max, cx: 0, cy: 0 });
    });
  }

  let mx = 0, my = 0;
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

  function tick(): void {
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      const dx = mx - (r.left + r.width / 2);
      const dy = my - (r.top + r.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      let tgtX = 0, tgtY = 0;
      if (dist < it.threshold) {
        const s = 1 - dist / it.threshold;
        tgtX = dx * s * (it.max / it.threshold);
        tgtY = dy * s * (it.max / it.threshold);
      }
      it.cx += (tgtX - it.cx) * 0.15;
      it.cy += (tgtY - it.cy) * 0.15;
      it.el.style.setProperty('--magnetic-x', `${it.cx}px`);
      it.el.style.setProperty('--magnetic-y', `${it.cy}px`);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

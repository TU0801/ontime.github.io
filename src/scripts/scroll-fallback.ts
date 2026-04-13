// scroll 関連の JS フォールバック群（animation-timeline: scroll() 非対応ブラウザ向け）

export function initHeroParallaxFallback(): void {
  if (CSS.supports?.('animation-timeline', 'scroll()')) return;
  const hc = document.querySelector<HTMLElement>('.hero-content');
  if (!hc) return;
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        const end = window.innerHeight * 0.6;
        if (sy <= end) {
          const p = sy / end;
          hc.style.transform = `scale(${1 - p * 0.12}) translateY(${-p * 60}px)`;
          hc.style.opacity = String(1 - p);
        } else {
          hc.style.opacity = '0';
        }
        ticking = false;
      });
      ticking = true;
    },
    { passive: true },
  );
}

export function initScrollProgressFallback(): void {
  if (CSS.supports?.('animation-timeline', 'scroll()')) return;
  const bar = document.querySelector<HTMLElement>('.scroll-progress');
  if (!bar) return;
  bar.style.animation = 'none';
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const dh = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = dh > 0 ? `${(window.scrollY / dh) * 100}%` : '0%';
        ticking = false;
      });
      ticking = true;
    },
    { passive: true },
  );
}

export function initCTAGlow(): void {
  setTimeout(() => {
    const cta = document.querySelector('.hero .cta-btn');
    if (cta) cta.classList.add('glowing');
  }, 4000);
}

export function enhanceHeader(): void {
  const header = document.querySelector('header');
  if (header) header.classList.add('enhanced');
}

function animateCounter(el: HTMLElement): void {
  const target = Number.parseInt(el.dataset.target ?? '0', 10);
  const suffix = el.dataset.suffix ?? '';
  const duration = 2000;
  const start = performance.now();
  function update(now: number): void {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = Math.round(eased * target).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

export function initCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('.metric-number[data-target]');
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animateCounter(entry.target as HTMLElement);
        obs.unobserve(entry.target);
      }
    },
    { threshold: 0.5 },
  );
  counters.forEach((el) => {
    obs.observe(el);
  });
}

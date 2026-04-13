// Section reveal / dark-mode shift / footer border の IntersectionObserver 群

export function initSectionObservers(): void {
  // Section reveal + bento stagger + highlight underline
  const revealObs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('section-hidden');
        entry.target.classList.add('section-visible');
        entry.target.querySelectorAll('.bento-card').forEach((c) => {
          c.classList.add('revealed');
        });
        entry.target.querySelectorAll<HTMLElement>('.highlight').forEach((hl, i) => {
          setTimeout(() => hl.classList.add('animate-underline'), 400 + i * 200);
        });
        revealObs.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
  );
  document.querySelectorAll('.section-hidden').forEach((el) => {
    revealObs.observe(el);
  });

  // Dark mode shift (philosophy section)
  const phil = document.querySelector('.philosophy');
  if (phil) {
    const darkObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            document.body.classList.add('theme-dark');
          } else if (!entry.isIntersecting) {
            document.body.classList.remove('theme-dark');
          }
        }
      },
      { threshold: [0, 0.3, 0.7, 1] },
    );
    darkObs.observe(phil);
  }

  // Footer border
  const footer = document.querySelector('footer');
  if (footer) {
    const footerObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('border-visible');
            footerObs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );
    footerObs.observe(footer);
  }
}

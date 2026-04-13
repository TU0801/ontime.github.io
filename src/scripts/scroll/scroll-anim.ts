// GSAP + ScrollTrigger によるセクション enter/exit アニメーション
// 既存 IntersectionObserver と併存（既存は section-visible class、こちらは GSAP timeline）

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { isReducedMotion } from '../../lib/motion';

gsap.registerPlugin(ScrollTrigger);

export function initScrollAnimations(): void {
  if (isReducedMotion()) return;

  // Hero exit: scroll で content を fade-out + scale down（CSS scroll-timeline と並列、補強）
  gsap.to('.hero-content', {
    opacity: 0,
    scale: 0.88,
    y: -40,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom 30%',
      scrub: 0.6,
    },
  });

  // Bento card stagger reveal
  gsap.from('.bento-card', {
    opacity: 0,
    y: 32,
    duration: 0.7,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.tech-showcase',
      start: 'top 70%',
      once: true,
    },
  });

  // Case preview
  gsap.from('.case-preview', {
    opacity: 0,
    y: 40,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.case-studies',
      start: 'top 70%',
      once: true,
    },
  });

  // Pre-footer CTA: heading scale-in + sub fade-in
  gsap.from('.cta-heading', {
    opacity: 0,
    scale: 0.85,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.pre-footer-cta',
      start: 'top 80%',
      once: true,
    },
  });
  gsap.from('.cta-sub', {
    opacity: 0,
    y: 16,
    duration: 0.7,
    delay: 0.15,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.pre-footer-cta',
      start: 'top 80%',
      once: true,
    },
  });

  // Impact metric カード stagger
  gsap.from('.metric-card', {
    opacity: 0,
    y: 24,
    duration: 0.6,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.impact-numbers',
      start: 'top 75%',
      once: true,
    },
  });
}

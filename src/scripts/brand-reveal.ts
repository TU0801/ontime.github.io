// ブランド演出のライフサイクル。localStorage で "seen" フラグを管理し、
// 初回訪問時のみ表示する。ユーザー入力でスキップ可能。

import { prefersReducedMotion } from './flags';

const STORAGE_KEY = 'onclik:reveal-seen';
const TOTAL_MS = 2800;
const EXIT_MS = 600;

export function initBrandReveal(): (() => void) | undefined {
  const el = document.getElementById('brand-reveal');
  if (!(el instanceof HTMLElement)) return undefined;

  // 再訪や reduced-motion では即非表示
  let seen = false;
  try {
    seen = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // localStorage 不可な環境は表示しない
    seen = true;
  }

  if (seen || prefersReducedMotion) {
    el.classList.add('done');
    return undefined;
  }

  let finished = false;
  let exitTimer = 0;
  let removeTimer = 0;

  const exit = (): void => {
    if (finished) return;
    finished = true;
    el.classList.add('exiting');
    removeTimer = window.setTimeout(() => {
      el.classList.add('done');
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }, EXIT_MS);
  };

  // 自動フェード
  exitTimer = window.setTimeout(exit, TOTAL_MS);

  // 任意の入力でスキップ
  const skip = (): void => exit();
  el.addEventListener('click', skip);
  document.addEventListener('keydown', skip, { once: true });

  return () => {
    clearTimeout(exitTimer);
    clearTimeout(removeTimer);
    el.removeEventListener('click', skip);
    document.removeEventListener('keydown', skip);
  };
}

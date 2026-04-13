// 環境音 ON/OFF トグルボタンの初期化

import { isAmbientPlaying, startAmbient, stopAmbient } from './ambient';

export function initAmbientToggle(): void {
  const btn = document.getElementById('ambient-toggle');
  if (!(btn instanceof HTMLButtonElement)) return;

  btn.addEventListener('click', async () => {
    if (isAmbientPlaying()) {
      stopAmbient();
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      btn.querySelector('.speaker-icon')!.textContent = '🔇';
    } else {
      try {
        await startAmbient();
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        btn.querySelector('.speaker-icon')!.textContent = '🔊';
      } catch (e) {
        console.warn('[ambient] failed to start:', e);
      }
    }
  });
}

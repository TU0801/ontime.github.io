// 環境音 ON/OFF トグルボタンの初期化。ambient（Tone.js を引き込む）は click 時まで遅延ロード。

type AmbientModule = typeof import('./ambient');

let ambient: AmbientModule | null = null;
let loading: Promise<AmbientModule> | null = null;

async function getAmbient(): Promise<AmbientModule> {
  if (ambient) return ambient;
  if (!loading) loading = import('./ambient');
  ambient = await loading;
  return ambient;
}

export function initAmbientToggle(): void {
  const btn = document.getElementById('ambient-toggle');
  if (!(btn instanceof HTMLButtonElement)) return;

  btn.addEventListener('click', async () => {
    const mod = await getAmbient();
    if (mod.isAmbientPlaying()) {
      mod.stopAmbient();
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      btn.querySelector('.speaker-icon')!.textContent = '🔇';
    } else {
      try {
        await mod.startAmbient();
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        btn.querySelector('.speaker-icon')!.textContent = '🔊';
      } catch (e) {
        console.warn('[ambient] failed to start:', e);
      }
    }
  });
}

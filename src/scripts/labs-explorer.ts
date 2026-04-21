// Labs canvas フルスクリーン explorer モード。
// クリックで canvas-wrap を expand → body.labs-explorer クラスを付与。
// フルスクリーン中は wheel で zoom、drag で pan、Esc で exit。
// 通常時は labs-canvas.ts のマウス追従がそのまま有効。

import { getLabsControls } from './webgl/labs-controls';

type Cleanup = () => void;

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function injectStyles(): void {
  if (document.getElementById('labs-explorer-styles')) return;
  const style = document.createElement('style');
  style.id = 'labs-explorer-styles';
  style.textContent = `
    .labs-canvas-wrap { cursor: zoom-in; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }
    body.labs-explorer { overflow: hidden; }
    body.labs-explorer .labs-canvas-wrap {
      position: fixed; inset: 0;
      width: 100vw; height: 100vh;
      aspect-ratio: auto !important;
      z-index: 175;
      border-radius: 0;
      border: none;
      cursor: grab;
      box-shadow: none;
    }
    body.labs-explorer .labs-canvas-wrap:active { cursor: grabbing; }
    .labs-explorer-hint {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      z-index: 176;
      background: rgba(15,17,21,0.88);
      color: #E8E6E1;
      padding: 10px 18px;
      border-radius: 8px;
      font: 500 0.82rem/1.4 'Montserrat Variable', sans-serif;
      letter-spacing: 0.05em;
      border: 1px solid rgba(232,230,225,0.1);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s;
    }
    body.labs-explorer .labs-explorer-hint { opacity: 1; }
    .labs-explorer-hint kbd {
      display: inline-block;
      padding: 1px 6px; margin: 0 2px;
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
      background: rgba(232,230,225,0.1);
      border: 1px solid rgba(232,230,225,0.18);
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

export function initLabsExplorer(): Cleanup | undefined {
  const canvas = document.getElementById('labs-canvas');
  const wrap = canvas?.parentElement;
  if (!(canvas instanceof HTMLCanvasElement) || !(wrap instanceof HTMLElement)) return undefined;

  injectStyles();

  // ヒントバーを挿入
  const hint = document.createElement('div');
  hint.className = 'labs-explorer-hint';
  hint.innerHTML =
    '<kbd>Scroll</kbd> ズーム &nbsp; <kbd>Drag</kbd> パン &nbsp; <kbd>ESC</kbd> 終了';
  document.body.appendChild(hint);

  let active = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  const enter = (): void => {
    if (active) return;
    active = true;
    document.body.classList.add('labs-explorer');
  };

  const exit = (): void => {
    if (!active) return;
    active = false;
    document.body.classList.remove('labs-explorer');
    const ctrls = getLabsControls();
    ctrls?.setZoom(1);
    ctrls?.setPan(0, 0);
  };

  const onCanvasClick = (e: MouseEvent): void => {
    if (active) return;
    e.preventDefault();
    enter();
  };

  const onWheel = (e: WheelEvent): void => {
    if (!active) return;
    e.preventDefault();
    const ctrls = getLabsControls();
    if (!ctrls) return;
    const current = ctrls.getZoom();
    const factor = Math.exp(-e.deltaY * 0.002);
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * factor));
    ctrls.setZoom(next);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!active) return;
    const ctrls = getLabsControls();
    if (!ctrls) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const [px, py] = ctrls.getPan();
    panStartX = px;
    panStartY = py;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!active || !dragging) return;
    const ctrls = getLabsControls();
    if (!ctrls) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const zoom = ctrls.getZoom();
    // UV 単位 = px / canvas.width / zoom
    const rect = canvas.getBoundingClientRect();
    const nx = panStartX - dx / rect.width / zoom;
    const ny = panStartY + dy / rect.height / zoom; // WebGL の UV は上下反転
    ctrls.setPan(nx, ny);
  };

  const onPointerUp = (): void => {
    dragging = false;
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (active && e.key === 'Escape') {
      e.preventDefault();
      exit();
    }
  };

  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('keydown', onKeydown);

  return () => {
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('keydown', onKeydown);
    hint.remove();
    exit();
  };
}

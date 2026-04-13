// OGL ベースの WebGL Renderer ハンドル
// Phase 1-B-3: フローフィールド + マウス + dark mode 対応
// Phase 1-C で GPU instanced particles を追加予定

import { Mesh, Program, Renderer, Triangle } from 'ogl';

import basicVert from './shaders/basic.vert';
import flowFrag from './shaders/flow.frag';

export type WebGLHandle = {
  renderer: Renderer;
  dispose(): void;
};

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

/**
 * 既存の <canvas id="tech-canvas"> を OGL Renderer に紐付け、フローフィールドを描画。
 * WebGL 非対応なら null を返す（呼び出し側で Canvas 2D fallback へ）。
 */
export function initWebGLRenderer(canvas: HTMLCanvasElement): WebGLHandle | null {
  if (!supportsWebGL()) return null;

  const renderer = new Renderer({
    canvas,
    alpha: true,
    dpr: Math.min(window.devicePixelRatio, 2),
    antialias: true,
  });
  const gl = renderer.gl;

  // 状態
  let mouseX = -9999;
  let mouseY = -9999;
  let isDarkMode = false;

  const onMouseMove = (e: MouseEvent): void => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  };
  const onTouchMove = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (t) {
      mouseX = t.clientX;
      mouseY = t.clientY;
    }
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  const darkObs = new MutationObserver(() => {
    isDarkMode = document.body.classList.contains('theme-dark');
  });
  darkObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  onResize();
  window.addEventListener('resize', onResize);

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: basicVert,
    fragment: flowFrag,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: [mouseX, mouseY] },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uIsDark: { value: 0 },
    },
    transparent: true,
  });
  const mesh = new Mesh(gl, { geometry, program });

  let raf = 0;
  let time = 0;
  const render = (): void => {
    time += 0.016;
    program.uniforms.uTime.value = time;
    program.uniforms.uMouse.value = [mouseX, mouseY];
    program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight];
    program.uniforms.uIsDark.value = isDarkMode ? 1 : 0;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);

  return {
    renderer,
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      darkObs.disconnect();
    },
  };
}

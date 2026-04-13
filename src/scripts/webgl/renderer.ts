// OGL ベースの WebGL Renderer ハンドル
// Phase 1-B-1: minimal「Hello WebGL」レベル
// Phase 1-B-2 で Simplex / フローフィールドへ拡張、Phase 1-C で paritcles 追加予定。

import { Mesh, Program, Renderer, Triangle } from 'ogl';

import basicFrag from './shaders/basic.frag';
import basicVert from './shaders/basic.vert';

export type WebGLHandle = {
  renderer: Renderer;
  dispose(): void;
};

/**
 * 既存の <canvas id="tech-canvas"> を OGL Renderer に紐付け、minimal のシェーダーで描画。
 * Phase 1-B-2 以降で拡張する。
 */
export function initWebGLRenderer(canvas: HTMLCanvasElement): WebGLHandle | null {
  // WebGL2 が使えなければ早期 return（fallback は Phase 1-C-2）
  const supportsWebGL = (): boolean => {
    const test = document.createElement('canvas');
    return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
  };
  if (!supportsWebGL()) return null;

  const renderer = new Renderer({
    canvas,
    alpha: true,
    dpr: Math.min(window.devicePixelRatio, 2),
    antialias: true,
  });
  const gl = renderer.gl;

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  resize();
  window.addEventListener('resize', resize);

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: basicVert,
    fragment: basicFrag,
    uniforms: {
      uTime: { value: 0 },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  let raf = 0;
  let time = 0;
  const render = (): void => {
    time += 0.016;
    program.uniforms.uTime.value = time;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);

  return {
    renderer,
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}

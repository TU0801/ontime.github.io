// OGL ベースの WebGL Renderer ハンドル
// Phase 1-C-1: GPU パーティクル統合は OGL 1.x の uniform location bug で一時 disable
//   particle module (./particles.ts + particles.{vert,frag}) は残置、Phase 1-C 後半で
//   raw WebGL or 別アプローチで再導入予定

import { Mesh, Post, Program, Renderer, Transform, Triangle } from 'ogl';

import { sampleAudioFeatures } from '../audio/analyser';
import { sampleScrollFeatures } from '../scroll/scroll-state';
import type { QualityTier } from './quality';
import basicVert from './shaders/basic.vert';
import bloomFrag from './shaders/bloom-composite.frag';
import flowFrag from './shaders/flow.frag';

export type WebGLHandle = {
  renderer: Renderer;
  dispose(): void;
};

export type WebGLOptions = {
  tier?: QualityTier;
};

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

/**
 * <canvas id="tech-canvas"> を OGL Renderer に紐付ける。
 * - フローフィールド背景（flow.frag）
 * - GPU パーティクル群は Phase 1-C 後半で再導入予定
 * WebGL 非対応なら null（呼び出し側で Canvas 2D fallback）。
 */
export function initWebGLRenderer(
  canvas: HTMLCanvasElement,
  options: WebGLOptions = {},
): WebGLHandle | null {
  if (!supportsWebGL()) return null;
  // tier は将来 particle count / shader complexity の調整に使う（現状 placeholder）
  void options.tier;

  const renderer = new Renderer({
    canvas,
    alpha: true,
    dpr: Math.min(window.devicePixelRatio, 2),
    antialias: true,
  });
  const gl = renderer.gl;

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

  // Scene 構築（フローフィールド背景のみ。Phase 1-C 後半で particles 追加）
  const scene = new Transform();
  const flowGeometry = new Triangle(gl);
  const flowProgram = new Program(gl, {
    vertex: basicVert,
    fragment: flowFrag,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: [mouseX, mouseY] },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uIsDark: { value: 0 },
      uAudioEnergy: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioHigh: { value: 0 },
      uScroll: { value: 0 },
      uScrollVelocity: { value: 0 },
    },
    transparent: true,
  });
  const flowMesh = new Mesh(gl, { geometry: flowGeometry, program: flowProgram });
  flowMesh.setParent(scene);

  // Post-process: bloom + split-tone grading を 1 pass で処理。
  // OGL 1.x の Post で多段パス化するとシーン FBO の premultiplied alpha が
  // 二重に効いて色が潰れるため（Phase 12 調査）、composite 側に全部集約する。
  const post = new Post(gl);
  const compositePass = post.addPass({
    fragment: bloomFrag,
    uniforms: {
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uIntensity: { value: 0.55 },
      uScroll: { value: 0 },
      uAudioEnergy: { value: 0 },
    },
  });

  const onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.resize();
  };
  onResize();
  window.addEventListener('resize', onResize);

  let raf = 0;
  let time = 0;
  const render = (): void => {
    time += 0.016;
    const audio = sampleAudioFeatures();
    const scroll = sampleScrollFeatures();
    flowProgram.uniforms.uTime.value = time;
    flowProgram.uniforms.uMouse.value = [mouseX, mouseY];
    flowProgram.uniforms.uResolution.value = [window.innerWidth, window.innerHeight];
    flowProgram.uniforms.uIsDark.value = isDarkMode ? 1 : 0;
    flowProgram.uniforms.uAudioEnergy.value = audio.energy;
    flowProgram.uniforms.uAudioBass.value = audio.bass;
    flowProgram.uniforms.uAudioMid.value = audio.mid;
    flowProgram.uniforms.uAudioHigh.value = audio.high;
    flowProgram.uniforms.uScroll.value = scroll.progress;
    flowProgram.uniforms.uScrollVelocity.value = scroll.velocity;

    // composite pass: bloom 強度 + grading uniform を毎フレーム更新
    compositePass.uniforms.uIntensity.value = 0.55 + Math.abs(scroll.velocity) * 0.4;
    compositePass.uniforms.uScroll.value = scroll.progress;
    compositePass.uniforms.uAudioEnergy.value = audio.energy;

    post.render({ scene });
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
      // WebGL コンテキスト数の上限（Chromium 16）に達しないよう明示的に解放
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

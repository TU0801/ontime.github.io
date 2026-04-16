// GPU パーティクル群を別 canvas + 独立 WebGL context で描画
// OGL 1.x で flow program と uniform location が衝突するのを回避するため、
// 描画を完全に分離する戦略。

import { Geometry, Mesh, Program, Renderer, Transform } from 'ogl';

import { sampleAudioFeatures } from '../audio/analyser';
import { sampleScrollFeatures } from '../scroll/scroll-state';
import particlesFrag from './shaders/particles.frag';
import particlesVert from './shaders/particles.vert';

export type ParticleHandle = {
  dispose(): void;
};

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

/**
 * 指定された canvas に独立した WebGL context を立ててパーティクルを描画する。
 * 各粒子は seed (vec2) のみ持ち、頂点シェーダーで全演算（state-less GPU 並列）。
 */
export function initParticleField(
  canvas: HTMLCanvasElement,
  count = 12000,
  pointSize = 5,
): ParticleHandle | null {
  if (!supportsWebGL()) return null;

  const dpr = Math.min(window.devicePixelRatio, 2);
  const renderer = new Renderer({
    canvas,
    alpha: true,
    dpr,
    antialias: true,
  });
  const gl = renderer.gl;

  let mouseX = -9999;
  let mouseY = -9999;

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

  const onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  onResize();
  window.addEventListener('resize', onResize);

  // 各粒子の seed [0..1]^2 を生成
  const seeds = new Float32Array(count * 2);
  for (let i = 0; i < count * 2; i++) {
    seeds[i] = Math.random();
  }

  const geometry = new Geometry(gl, {
    position: { size: 2, data: seeds },
  });

  const program = new Program(gl, {
    vertex: particlesVert,
    fragment: particlesFrag,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: [mouseX, mouseY] },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uPointSize: { value: pointSize * dpr },
      uAudioEnergy: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioHigh: { value: 0 },
      uScroll: { value: 0 },
      uScrollVelocity: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const scene = new Transform();
  const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
  mesh.setParent(scene);

  let raf = 0;
  let time = 0;
  const render = (): void => {
    time += 0.016;
    const audio = sampleAudioFeatures();
    const scroll = sampleScrollFeatures();
    program.uniforms.uTime.value = time;
    program.uniforms.uMouse.value = [mouseX, mouseY];
    program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight];
    program.uniforms.uAudioEnergy.value = audio.energy;
    program.uniforms.uAudioBass.value = audio.bass;
    program.uniforms.uAudioMid.value = audio.mid;
    program.uniforms.uAudioHigh.value = audio.high;
    program.uniforms.uScroll.value = scroll.progress;
    program.uniforms.uScrollVelocity.value = scroll.velocity;
    renderer.render({ scene });
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

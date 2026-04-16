// Hero 背面に subdivided plane を置き、マウス位置を epicenter として
// ink-pool の波紋を走らせる。音の低域で呼吸、スクロールで減衰。

import type { OGLRenderingContext } from 'ogl';
import { Geometry, Mesh, Program, Renderer, Transform } from 'ogl';

import { sampleAudioFeatures } from '../audio/analyser';
import { sampleScrollFeatures } from '../scroll/scroll-state';
import rippleFrag from './shaders/ripple.frag';
import rippleVert from './shaders/ripple.vert';

export type HeroRippleHandle = {
  dispose(): void;
};

const SUBDIVISIONS = 44; // plane 解像度（大きいほど波が滑らか、負荷は上がる）

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

function buildPlaneGeometry(gl: OGLRenderingContext): Geometry {
  const N = SUBDIVISIONS;
  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= N; y++) {
    for (let x = 0; x <= N; x++) {
      const u = x / N;
      const v = y / N;
      // -1..1 にマップ
      verts.push(u * 2 - 1, v * 2 - 1);
      uvs.push(u, v);
    }
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const a = y * (N + 1) + x;
      const b = a + 1;
      const c = a + (N + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return new Geometry(gl, {
    position: { size: 2, data: new Float32Array(verts) },
    uv: { size: 2, data: new Float32Array(uvs) },
    index: { data: new Uint16Array(indices) },
  });
}

export function initHeroRipple(canvas: HTMLCanvasElement): HeroRippleHandle | null {
  if (!supportsWebGL()) return null;

  const dpr = Math.min(window.devicePixelRatio, 2);
  const renderer = new Renderer({
    canvas,
    alpha: true,
    dpr,
    antialias: true,
  });
  const gl = renderer.gl;

  const hero = document.querySelector<HTMLElement>('.hero');

  let mouseActive = 0; // 0..1 ホバー追従
  let mouseUvX = 0.5;
  let mouseUvY = 0.5;

  const onMouseMove = (e: MouseEvent): void => {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    mouseUvX = (e.clientX - rect.left) / rect.width;
    // WebGL の UV は通常下原点なので反転
    mouseUvY = 1 - (e.clientY - rect.top) / rect.height;
    mouseActive = 1;
  };
  const onMouseLeave = (): void => {
    mouseActive = 0;
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) onMouseLeave();
  });

  const resize = (): void => {
    if (!hero) {
      renderer.setSize(window.innerWidth, Math.max(400, window.innerHeight * 0.8));
      return;
    }
    const rect = hero.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.top = `${Math.max(0, rect.top + window.scrollY)}px`;
    canvas.style.left = `${rect.left}px`;
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', resize, { passive: true });

  const geometry = buildPlaneGeometry(gl);
  const program = new Program(gl, {
    vertex: rippleVert,
    fragment: rippleFrag,
    uniforms: {
      uTime: { value: 0 },
      uMouseUv: { value: [0.5, 0.5] },
      uMouseActive: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioEnergy: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  });

  const scene = new Transform();
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);

  let activeEased = 0;
  let raf = 0;
  let time = 0;

  const render = (): void => {
    raf = requestAnimationFrame(render);
    time += 0.016;

    // mouse active を lerp で滑らかにフェード
    activeEased += (mouseActive - activeEased) * 0.08;

    const audio = sampleAudioFeatures();
    const scroll = sampleScrollFeatures();
    // スクロールで hero から離れるほどリップルを抑える
    const scrollFade = Math.max(0, 1 - scroll.progress * 2.2);

    program.uniforms.uTime.value = time;
    program.uniforms.uMouseUv.value = [mouseUvX, mouseUvY];
    program.uniforms.uMouseActive.value = activeEased * scrollFade;
    program.uniforms.uAudioBass.value = audio.bass * scrollFade;
    program.uniforms.uAudioEnergy.value = audio.energy * scrollFade;

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(render);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', resize);
      window.removeEventListener('mousemove', onMouseMove);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

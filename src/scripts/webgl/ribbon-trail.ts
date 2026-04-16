// カーソル軌跡をリボンで描く（独立 WebGL context）
// 過去 N フレームの座標でトライアングルストリップを再構築。
// 加法合成で深コバルトの発光を重ねる。マウス停止中は自然にフェードアウト。

import { Geometry, Mesh, Program, Renderer, Transform } from 'ogl';

import { sampleAudioFeatures } from '../audio/analyser';
import { sampleScrollFeatures } from '../scroll/scroll-state';
import ribbonFrag from './shaders/ribbon.frag';
import ribbonVert from './shaders/ribbon.vert';

export type RibbonHandle = {
  dispose(): void;
};

const TRAIL_LENGTH = 52; // 軌跡として保持するサンプル数
const HEAD_WIDTH_PX = 16; // 先端のピクセル幅（墨の筆先くらい）
const MIN_SAMPLE_DISTANCE_PX = 6; // これ以上動いた時だけ新しいサンプルを push する
const IDLE_THRESHOLD_PX = 0.15; // 速度が閾値未満ならその場に凝集

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

type Sample = { x: number; y: number };

export function initRibbonTrail(canvas: HTMLCanvasElement): RibbonHandle | null {
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
  let hasPointer = false;

  const onMouseMove = (e: MouseEvent): void => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    hasPointer = true;
  };
  const onTouchMove = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (t) {
      mouseX = t.clientX;
      mouseY = t.clientY;
      hasPointer = true;
    }
  };
  const onPointerOut = (): void => {
    hasPointer = false;
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) onPointerOut();
  });

  const onResize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  onResize();
  window.addEventListener('resize', onResize);

  // 軌跡履歴をリングバッファで
  const samples: Sample[] = [];
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    samples.push({ x: -9999, y: -9999 });
  }
  let lastInsertedX = -9999;
  let lastInsertedY = -9999;

  const vertexCount = TRAIL_LENGTH * 2;
  const posArray = new Float32Array(vertexCount * 2);
  const ageArray = new Float32Array(vertexCount);

  const geometry = new Geometry(gl, {
    position: { size: 2, data: posArray, usage: gl.DYNAMIC_DRAW },
    age: { size: 1, data: ageArray, usage: gl.DYNAMIC_DRAW },
  });

  const program = new Program(gl, {
    vertex: ribbonVert,
    fragment: ribbonFrag,
    uniforms: {
      uTime: { value: 0 },
      uAudioEnergy: { value: 0 },
      uScrollVelocity: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  });

  // デフォルトのアルファ合成（transparent: true に OGL が設定する）を使う。
  // 加法だと明るい背景では薄くなるため、ブランドの墨筆と整合させる。

  const scene = new Transform();
  const mesh = new Mesh(gl, { geometry, program, mode: gl.TRIANGLE_STRIP });
  mesh.setParent(scene);

  const toNdcX = (px: number): number => (px / window.innerWidth) * 2 - 1;
  const toNdcY = (px: number): number => -((px / window.innerHeight) * 2 - 1);

  let raf = 0;
  let time = 0;

  const render = (): void => {
    raf = requestAnimationFrame(render);
    time += 0.016;

    // 前回 push した位置から十分離れたら新サンプルを挿入。
    // 小さい動きでは samples[0] だけ先端を追従させ、三角形の退化を防ぐ。
    const dx = mouseX - lastInsertedX;
    const dy = mouseY - lastInsertedY;
    if (dx * dx + dy * dy > MIN_SAMPLE_DISTANCE_PX * MIN_SAMPLE_DISTANCE_PX) {
      for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
        samples[i].x = samples[i - 1].x;
        samples[i].y = samples[i - 1].y;
      }
      lastInsertedX = mouseX;
      lastInsertedY = mouseY;
    }
    samples[0].x = mouseX;
    samples[0].y = mouseY;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const cur = samples[i];
      const next = samples[Math.min(i + 1, TRAIL_LENGTH - 1)];
      let tx = cur.x - next.x;
      let ty = cur.y - next.y;
      const len = Math.sqrt(tx * tx + ty * ty);

      // 凝集時の法線（停止中でも潰れないよう一定方向）
      if (len < IDLE_THRESHOLD_PX) {
        tx = 1;
        ty = 0;
      } else {
        tx /= len;
        ty /= len;
      }

      const nx = -ty;
      const ny = tx;

      const age = i / (TRAIL_LENGTH - 1);
      const halfWidth = HEAD_WIDTH_PX * (1 - age);

      const aX = cur.x + nx * halfWidth;
      const aY = cur.y + ny * halfWidth;
      const bX = cur.x - nx * halfWidth;
      const bY = cur.y - ny * halfWidth;

      posArray[i * 4 + 0] = toNdcX(aX);
      posArray[i * 4 + 1] = toNdcY(aY);
      posArray[i * 4 + 2] = toNdcX(bX);
      posArray[i * 4 + 3] = toNdcY(bY);
      ageArray[i * 2 + 0] = age;
      ageArray[i * 2 + 1] = age;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.age.needsUpdate = true;

    const audio = sampleAudioFeatures();
    const scroll = sampleScrollFeatures();
    program.uniforms.uTime.value = time;
    program.uniforms.uAudioEnergy.value = audio.energy;
    program.uniforms.uScrollVelocity.value = scroll.velocity;

    // ポインタがページ外に出たら何も描かない（履歴がフェード表示中の時は描く）
    if (!hasPointer && samples[0].x < 0) {
      // リング全体が外に出ていれば描画スキップ
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(render);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    },
  };
}

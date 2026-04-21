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

const TRAIL_LENGTH = 64; // 軌跡として保持するサンプル数
const HEAD_WIDTH_PX = 16; // 先端のピクセル幅（墨の筆先くらい）
const IDLE_THRESHOLD_PX = 0.15; // 速度が閾値未満ならその場に凝集
// 先頭 → 末尾のバネ追従係数。先端は素早く、末端ほど慣性で遅れる。
const FOLLOW_HEAD = 0.42;
const FOLLOW_TAIL = 0.22;

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
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

  // 軌跡履歴。spring chain で毎フレーム更新するので、単純なセグメント配列。
  const samples: Sample[] = [];
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    samples.push({ x: -9999, y: -9999 });
  }
  let initialized = false;

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

    // 毎フレーム、各セグメントを前のセグメントへバネ的に近づける。
    // 旧実装の「距離閾値を超えたらリングシフト」だと段差が生まれていたが、
    // チェーン追従なら速度に比例した滑らかな曲線が自然に出る。
    if (!initialized && hasPointer) {
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        samples[i].x = mouseX;
        samples[i].y = mouseY;
      }
      initialized = true;
    } else if (initialized) {
      samples[0].x = lerp(samples[0].x, mouseX, FOLLOW_HEAD);
      samples[0].y = lerp(samples[0].y, mouseY, FOLLOW_HEAD);
      for (let i = 1; i < TRAIL_LENGTH; i++) {
        const t = i / (TRAIL_LENGTH - 1);
        const k = lerp(FOLLOW_HEAD, FOLLOW_TAIL, t);
        samples[i].x = lerp(samples[i].x, samples[i - 1].x, k);
        samples[i].y = lerp(samples[i].y, samples[i - 1].y, k);
      }
    }

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const cur = samples[i];
      // 法線は中心差分で。両端は片側差分にフォールバック。
      const prev = samples[Math.max(i - 1, 0)];
      const next = samples[Math.min(i + 1, TRAIL_LENGTH - 1)];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
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
      // 先頭を点に収束させ、中盤でピーク、末尾も細らせる紡錘型。
      // cos だと先頭が矩形カットに見えて丸カーソルと繋がらないため、sin で
      // 両端を 0 にし、pow で先頭近くを早めに立ち上げて筆の穂先感を出す。
      const taper = Math.sin(age * Math.PI) ** 0.6;
      const halfWidth = HEAD_WIDTH_PX * taper;

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

    // ポインタが一度も入っていなければ描画しない（-9999 で外に飛ばない）
    if (!initialized) {
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
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// Labs section の generative art
// Domain warping 2-pass fbm を独立 WebGL context で描画。
// マウスは canvas 内のみで追従、離れたら外（-1,-1）扱いに。

import { Mesh, Program, Renderer, Transform, Triangle } from 'ogl';

import { sampleAudioFeatures } from '../audio/analyser';
import { setLabsControls } from './labs-controls';
import basicVert from './shaders/basic.vert';
import labsFrag from './shaders/labs.frag';

export type LabsHandle = {
  dispose(): void;
};

function supportsWebGL(): boolean {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') ?? test.getContext('webgl'));
}

export function initLabsCanvas(canvas: HTMLCanvasElement): LabsHandle | null {
  if (!supportsWebGL()) return null;

  const dpr = Math.min(window.devicePixelRatio, 2);
  const renderer = new Renderer({
    canvas,
    alpha: false,
    dpr,
    antialias: true,
  });
  const gl = renderer.gl;

  let mouseUvX = -1;
  let mouseUvY = -1;

  const onMouseMove = (e: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      mouseUvX = -1;
      mouseUvY = -1;
      return;
    }
    mouseUvX = (e.clientX - rect.left) / rect.width;
    mouseUvY = 1 - (e.clientY - rect.top) / rect.height;
  };
  window.addEventListener('mousemove', onMouseMove);

  const onResize = (): void => {
    const w = Math.max(1, canvas.clientWidth || canvas.offsetWidth || 1);
    const h = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 1);
    renderer.setSize(w, h);
    // OGL setSize は style.width/height を書き換えるので CSS 100% を維持
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  };
  const resizeObs = new ResizeObserver(onResize);
  resizeObs.observe(canvas);
  window.addEventListener('resize', onResize);
  // 初期化時は layout 待ちで再試行
  onResize();
  requestAnimationFrame(onResize);

  // IntersectionObserver で視認外のときは render を停止（省電力）
  let visible = true;
  const vizObs = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (e) visible = e.isIntersecting;
    },
    { threshold: 0.05 },
  );
  vizObs.observe(canvas);

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: basicVert,
    fragment: labsFrag,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [canvas.width, canvas.height] },
      uMouseUv: { value: [-1, -1] },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioHigh: { value: 0 },
      uZoom: { value: 1 },
      uPan: { value: [0, 0] },
    },
    transparent: false,
    depthTest: false,
    depthWrite: false,
  });

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  setLabsControls({
    setZoom: (z) => {
      zoom = Math.max(1, Math.min(10, z));
    },
    setPan: (x, y) => {
      panX = x;
      panY = y;
    },
    getZoom: () => zoom,
    getPan: () => [panX, panY],
  });

  const scene = new Transform();
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);

  let raf = 0;
  let time = 0;

  const render = (): void => {
    raf = requestAnimationFrame(render);
    if (!visible) return;

    time += 0.016;
    const audio = sampleAudioFeatures();

    program.uniforms.uTime.value = time;
    program.uniforms.uResolution.value = [canvas.width, canvas.height];
    program.uniforms.uMouseUv.value = [mouseUvX, mouseUvY];
    program.uniforms.uAudioBass.value = audio.bass;
    program.uniforms.uAudioMid.value = audio.mid;
    program.uniforms.uAudioHigh.value = audio.high;
    program.uniforms.uZoom.value = zoom;
    program.uniforms.uPan.value = [panX, panY];

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(render);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      resizeObs.disconnect();
      vizObs.disconnect();
      setLabsControls(null);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

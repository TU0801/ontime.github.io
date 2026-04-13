// GPU パーティクル群を生成
// gl.POINTS モードで、各粒子は seed (vec2) のみ持ち、頂点シェーダーで全演算

import { Geometry, Mesh, Program, type Renderer } from 'ogl';

import particlesFrag from './shaders/particles.frag';
import particlesVert from './shaders/particles.vert';

export type ParticleFieldHandle = {
  mesh: Mesh;
  setUniforms(time: number, mouse: [number, number], resolution: [number, number]): void;
  setPointSize(size: number): void;
};

/**
 * 指定数のパーティクル群を生成。各粒子は ND 空間内で flow field に沿って永続的に流れる。
 * 状態は持たず、毎フレーム seed + time から決定論的に位置を計算するため、
 * GPU 上で完全並列、CPU 側のループはゼロ。
 */
export function createParticleField(
  renderer: Renderer,
  count: number,
  pointSize = 2,
): ParticleFieldHandle {
  const gl = renderer.gl;

  // 各粒子の seed [0..1]^2 をランダム生成
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
      uMouse: { value: [-9999, -9999] },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uPointSize: { value: pointSize },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });

  return {
    mesh,
    setUniforms(time, mouse, resolution): void {
      program.uniforms.uTime.value = time;
      program.uniforms.uMouse.value = mouse;
      program.uniforms.uResolution.value = resolution;
    },
    setPointSize(size): void {
      program.uniforms.uPointSize.value = size;
    },
  };
}

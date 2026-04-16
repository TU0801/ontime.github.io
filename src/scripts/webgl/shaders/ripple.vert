// Hero ink-pool ripple vertex shader
// 細かく分割された plane geometry を、mouse 位置を epicenter として
// radial wave で凹凸させる。音の低域でグローバル振幅が呼吸。

attribute vec2 position;
attribute vec2 uv;

uniform float uTime;
uniform vec2 uMouseUv;        // 0..1 空間での正規化マウス位置
uniform float uMouseActive;   // 0..1 でホバー中の強度
uniform float uAudioBass;
uniform float uAudioEnergy;

varying vec2 vUv;
varying float vRipple;

void main() {
  vUv = uv;

  // UV 空間でマウスからの距離を計算
  vec2 toMouse = uv - uMouseUv;
  // アスペクト補正（plane が横長の場合を想定して 2:1 くらい）
  toMouse.x *= 1.8;
  float dist = length(toMouse);

  // 同心円 wave + 指数減衰
  float phase = dist * 22.0 - uTime * 3.2;
  float wave = sin(phase) / (1.0 + dist * dist * 18.0);
  wave *= uMouseActive;

  // 低域で全体振幅を呼吸させる（ホバー外でも微かに動く）
  float ambient = sin(uTime * 0.7 + uv.x * 4.0 + uv.y * 3.0) * 0.02;
  ambient *= 0.3 + uAudioBass * 1.2;

  float displace = wave * 0.05 + ambient;
  vRipple = displace;

  // z 方向にオフセット（実際はクリップ空間に投影）
  gl_Position = vec4(position, displace, 1.0);
}

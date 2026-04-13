// GPU パーティクル vertex shader
// 各 instance の seed (position attribute) + time から決定論的に位置計算
// life cycle / color / mouse 引力 / flow field 追従を全部 GPU 並列で

attribute vec2 position;  // 各粒子固有の seed [0..1]^2

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uPointSize;

varying float vAlpha;
varying vec3 vColor;

#include './simplex.glsl';

void main() {
  vec2 seed = position;

  // 基準位置を NDC [-1..1] にマップ
  vec2 p = seed * 2.0 - 1.0;

  // フローフィールド追従（4 ステップ積分）
  for (int i = 0; i < 4; i++) {
    float angle = snoise(p * 0.6 + uTime * 0.05 + float(i) * 0.5) * 6.28318;
    p += vec2(cos(angle), sin(angle)) * 0.04;
  }

  // 画面外に出たら反対側へラップ
  p = mod(p + 1.0, 2.0) - 1.0;

  // マウス引力
  vec2 mouseClip = uMouse / uResolution * 2.0 - 1.0;
  mouseClip.y = -mouseClip.y;
  vec2 toMouse = mouseClip - p;
  float md = length(toMouse);
  if (md < 0.4 && md > 0.001) {
    p += normalize(toMouse) * (1.0 - md / 0.4) * 0.06;
  }

  // ライフサイクル: sin 波形でフェード in/out
  float lifePhase = seed.y * 6.28 + uTime * 0.2;
  vAlpha = (sin(lifePhase) * 0.5 + 0.5) * 0.7;

  // 色: シード位相 + 時間で 3 色グラデーション
  float colorMix = (sin(seed.x * 6.28 + uTime * 0.1) + 1.0) * 0.5;
  vColor = mix(
    mix(vec3(0.0, 0.776, 1.0), vec3(0.616, 0.314, 0.733), colorMix),
    vec3(1.0, 0.294, 0.122),
    seed.x * 0.3
  );

  // depth-like スケール（手前の粒は大きく見える）
  float depth = fract(seed.x * 7.13);
  gl_PointSize = uPointSize * (0.4 + depth * 0.6);

  gl_Position = vec4(p, 0.0, 1.0);
}

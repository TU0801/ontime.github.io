// GPU パーティクル vertex shader
// モノトーン + コバルトで個体をシード位相から揺らす

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

  // ライフサイクル: sin 波形でフェード in/out（より静かに）
  float lifePhase = seed.y * 6.28 + uTime * 0.18;
  vAlpha = (sin(lifePhase) * 0.5 + 0.5) * 0.85;

  // 色: コバルト基調のモノトーン。シード位相で微細な明度バリアンス
  vec3 deep = vec3(0.118, 0.227, 0.373);  // #1E3A5F
  vec3 mid  = vec3(0.353, 0.478, 0.580);  // #5A7A94
  vec3 haze = vec3(0.780, 0.795, 0.815);  // 蒼白
  float tone = sin(seed.x * 6.28 + uTime * 0.08) * 0.5 + 0.5;
  vec3 c1 = mix(deep, mid, tone);
  // ごくわずかに蒼白を混ぜて空気感を出す
  vColor = mix(c1, haze, seed.y * 0.25);

  // depth-like スケール（手前の粒は大きく、奥は細かく）
  float depth = fract(seed.x * 7.13);
  gl_PointSize = uPointSize * (0.55 + depth * 0.85);

  gl_Position = vec4(p, 0.0, 1.0);
}

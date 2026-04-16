// GPU パーティクル vertex shader
// モノトーン + コバルトで個体をシード位相から揺らす

attribute vec2 position;  // 各粒子固有の seed [0..1]^2

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uPointSize;
uniform float uAudioEnergy;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;

varying float vAlpha;
varying vec3 vColor;

#include './simplex.glsl';

void main() {
  vec2 seed = position;

  // 基準位置を NDC [-1..1] にマップ
  vec2 p = seed * 2.0 - 1.0;

  // フローフィールド追従（4 ステップ積分）中域でドリフト速度を上げる
  float drift = 0.04 + uAudioMid * 0.05;
  float flowTime = uTime * (0.05 + uAudioMid * 0.12);
  for (int i = 0; i < 4; i++) {
    float angle = snoise(p * 0.6 + flowTime + float(i) * 0.5) * 6.28318;
    p += vec2(cos(angle), sin(angle)) * drift;
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

  // ライフサイクル: sin 波形でフェード in/out（エネルギーで底上げ）
  float lifePhase = seed.y * 6.28 + uTime * 0.18;
  vAlpha = (sin(lifePhase) * 0.5 + 0.5) * 0.85 * (1.0 + uAudioEnergy * 0.4);

  // 色: コバルト基調のモノトーン。高域でハイライトへ寄せる
  vec3 deep = vec3(0.118, 0.227, 0.373);  // #1E3A5F
  vec3 mid  = vec3(0.353, 0.478, 0.580);  // #5A7A94
  vec3 haze = vec3(0.780, 0.795, 0.815);  // 蒼白
  float tone = sin(seed.x * 6.28 + uTime * 0.08) * 0.5 + 0.5;
  vec3 c1 = mix(deep, mid, tone);
  // 高域パルスで haze 比率を上げてキラつかせる
  float hazeMix = seed.y * 0.25 + uAudioHigh * 0.35;
  vColor = mix(c1, haze, clamp(hazeMix, 0.0, 0.9));

  // depth-like スケール + 低域でビートに合わせて膨らむ
  float depth = fract(seed.x * 7.13);
  float bassPulse = 1.0 + uAudioBass * 0.55;
  gl_PointSize = uPointSize * (0.55 + depth * 0.85) * bassPulse;

  gl_Position = vec4(p, 0.0, 1.0);
}

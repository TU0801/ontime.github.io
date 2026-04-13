// フローフィールド + ポストエフェクト統合フラグメントシェーダー
// Phase 2-A: Chromatic Aberration / Vignette / Film Grain を inline 追加

precision highp float;

#include './simplex.glsl';

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;       // 画面座標ピクセル
uniform vec2 uResolution;  // 画面サイズピクセル
uniform float uIsDark;     // 0.0 = light, 1.0 = dark

// 4 色パレット
vec3 paletteSample(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  vec3 a, b;
  float f;
  if (t < 1.0) {
    a = vec3(0.0, 0.776, 1.0);
    b = vec3(0.616, 0.314, 0.733);
    f = t;
  } else if (t < 2.0) {
    a = vec3(0.616, 0.314, 0.733);
    b = vec3(1.0, 0.294, 0.122);
    f = t - 1.0;
  } else {
    a = vec3(1.0, 0.294, 0.122);
    b = vec3(0.196, 0.196, 0.196);
    f = t - 2.0;
  }
  return mix(a, b, f);
}

// flow フィールド + パレット + マウス + ribbon を計算
// Chromatic Aberration の 3 回呼び出しに対応するため関数化
vec3 computeBaseColor(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

  float angle = snoise(p * 0.8 + uTime * 0.05) * 6.28318;
  vec2 dir = vec2(cos(angle), sin(angle));

  float streak = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = float(i) * 0.1;
    streak += snoise((p + dir * t) * 1.2 + uTime * 0.03);
  }
  streak = (streak / 6.0 + 1.0) * 0.5;

  vec3 color = paletteSample(streak);
  color = mix(color, color * 0.4 + vec3(0.05), uIsDark);

  vec2 mouseNorm = uMouse / uResolution;
  vec2 mp = (mouseNorm - 0.5) * vec2(aspect, 1.0) * 2.0;
  float md = distance(p, mp);
  color += vec3(0.3, 0.5, 0.6) * smoothstep(0.55, 0.0, md) * 0.5;

  float ribbonNoise = snoise(p * 0.3 + uTime * 0.02);
  float ribbon = sin(uv.y * 8.0 + ribbonNoise * 3.14159) * 0.5 + 0.5;
  ribbon = pow(ribbon, 4.0) * 0.15;
  color += paletteSample(streak * 0.8 + 0.2) * ribbon;

  return color;
}

// hash-based pseudo-random（grain 用）
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;
  float dist = distance(uv, vec2(0.5));

  // === Chromatic Aberration: 中心からの距離スケールで R/B を別 uv で sampling ===
  vec2 caOffset = (uv - 0.5) * dist * 0.012;
  vec3 baseR = computeBaseColor(uv + caOffset);
  vec3 baseG = computeBaseColor(uv);
  vec3 baseB = computeBaseColor(uv - caOffset);
  vec3 color = vec3(baseR.r, baseG.g, baseB.b);

  // === Vignette: 周辺の明度を落とす ===
  float vignette = smoothstep(0.85, 0.3, dist);
  color *= mix(1.0, vignette, 0.55);

  // === Film Grain: hash21 で擬似ノイズ、time で動的 ===
  float grain = hash21(uv * uResolution + uTime * 100.0) - 0.5;
  color += vec3(grain) * 0.05;

  gl_FragColor = vec4(color, 0.85);
}

// フローフィールド + ポストエフェクト統合フラグメントシェーダー
// モノクローム × 深いコバルト トーン（淡い霞として描画）

precision highp float;

#include './simplex.glsl';

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;       // 画面座標ピクセル
uniform vec2 uResolution;  // 画面サイズピクセル
uniform float uIsDark;     // 0.0 = light, 1.0 = dark
uniform float uAudioEnergy; // 全帯域 RMS（0..1）
uniform float uAudioBass;   // 〜250Hz 帯（0..1）
uniform float uAudioMid;    // 250〜2000Hz 帯（0..1）
uniform float uAudioHigh;   // 2kHz〜 帯（0..1）

// 明るめレンジを中心に据え、深いコバルトは影としてだけ使う
vec3 paletteSample(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 haze   = vec3(0.890, 0.895, 0.905);  // 蒼白（ほぼクリームに近い）
  vec3 mist   = vec3(0.710, 0.735, 0.770);  // 明るいダスティ
  vec3 dusty  = vec3(0.455, 0.545, 0.640);  // 中間
  vec3 deep   = vec3(0.180, 0.290, 0.430);  // コバルト（影）
  if (t < 0.4) {
    return mix(haze, mist, t / 0.4);
  } else if (t < 0.75) {
    return mix(mist, dusty, (t - 0.4) / 0.35);
  } else {
    return mix(dusty, deep, (t - 0.75) / 0.25);
  }
}

vec3 computeBaseColor(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

  // 中域で流れ角速度を加速、低域で波長を揺らす
  float flowSpeed = 0.05 + uAudioMid * 0.12;
  float flowScale = 0.8 + uAudioBass * 0.35;
  float angle = snoise(p * flowScale + uTime * flowSpeed) * 6.28318;
  vec2 dir = vec2(cos(angle), sin(angle));

  float streak = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = float(i) * 0.1;
    streak += snoise((p + dir * t) * 1.2 + uTime * 0.03);
  }
  streak = (streak / 6.0 + 1.0) * 0.5;
  // 高域でハイライトを押し上げ（表面の輝度勾配を強調）
  streak = clamp(streak + uAudioHigh * 0.12, 0.0, 1.0);

  vec3 color = paletteSample(streak);

  // Dark モードでは深み、Light モードではほぼそのまま明るく保つ
  color = mix(color, color * 0.32 + vec3(0.03, 0.04, 0.06), uIsDark);

  // マウス位置に控えめなコバルトのホットスポット（音のエネルギーで膨張）
  vec2 mouseNorm = uMouse / uResolution;
  vec2 mp = (mouseNorm - 0.5) * vec2(aspect, 1.0) * 2.0;
  float md = distance(p, mp);
  float hotRadius = 0.55 + uAudioEnergy * 0.25;
  float hotStrength = 0.4 + uAudioEnergy * 0.5;
  color += vec3(0.06, 0.10, 0.18) * smoothstep(hotRadius, 0.0, md) * hotStrength;

  // 低域で全体にコバルトの深さをうっすら重ねる（壁が呼吸するように）
  color += vec3(0.03, 0.05, 0.09) * uAudioBass * 0.8;

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

  // === Chromatic Aberration: 高域でオフセットを拡大（ビートで色ズレ） ===
  float caAmount = 0.004 + uAudioHigh * 0.006;
  vec2 caOffset = (uv - 0.5) * dist * caAmount;
  vec3 baseR = computeBaseColor(uv + caOffset);
  vec3 baseG = computeBaseColor(uv);
  vec3 baseB = computeBaseColor(uv - caOffset);
  vec3 color = vec3(baseR.r, baseG.g, baseB.b);

  // === Vignette: エネルギーで呼吸 ===
  float vignetteEdge = 0.95 - uAudioEnergy * 0.12;
  float vignette = smoothstep(vignetteEdge, 0.2, dist);
  color *= mix(1.0, vignette, 0.35);

  // === Film Grain ===
  float grain = hash21(uv * uResolution + uTime * 100.0) - 0.5;
  color += vec3(grain) * 0.035;

  // alpha も低域で微かに濃くなる（0.55 → 0.62）
  float alpha = 0.55 + uAudioBass * 0.07;
  gl_FragColor = vec4(color, alpha);
}

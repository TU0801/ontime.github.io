// Bloom composite + cinematic grading（1 pass に集約）
// scene (tMap) から高輝度を疑似 Gaussian blur で抽出し additive blend、そのまま
// split-tone（shadows → deep cobalt / highlights → warm cream）+ S-curve で仕上げる。

precision highp float;

uniform sampler2D tMap;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uScroll;         // 0..1
uniform float uAudioEnergy;    // 0..1

varying vec2 vUv;

vec3 splitTone(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint    = vec3(0.06, 0.11, 0.20);   // 深コバルトの影
  vec3 highlightTint = vec3(0.97, 0.95, 0.92);   // 暖かいクリーム
  float shadowMask    = 1.0 - smoothstep(0.0, 0.46, luma);
  float highlightMask = smoothstep(0.55, 0.95, luma);
  color = mix(color, color * 0.78 + shadowTint * 0.22, shadowMask * 0.35);
  color = mix(color, color * 0.88 + highlightTint * 0.12, highlightMask * 0.22);
  return color;
}

vec3 sCurve(vec3 c, float strength) {
  vec3 curved = c * c * (3.0 - 2.0 * c); // smoothstep(0,1,c)
  return mix(c, curved, strength);
}

void main() {
  vec3 base = texture2D(tMap, vUv).rgb;

  // === Bloom: 16 方向 × 3 半径 = 48 samples の疑似 Gaussian ===
  vec3 bloom = vec3(0);
  vec2 px = 1.0 / uResolution;
  const float TAU = 6.28318;
  for (int i = 0; i < 16; i++) {
    float a = float(i) / 16.0 * TAU;
    vec2 dir = vec2(cos(a), sin(a));
    for (int r = 1; r <= 3; r++) {
      vec2 offset = dir * px * float(r) * 6.0;
      vec3 c = texture2D(tMap, vUv + offset).rgb;
      float br = max(max(c.r, c.g), c.b);
      bloom += c * smoothstep(0.5, 0.9, br);
    }
  }
  bloom /= 48.0;

  vec3 color = base + bloom * uIntensity;

  // === Cinematic grading ===
  color = splitTone(color);
  color = sCurve(color, 0.10 + uScroll * 0.04);

  // スクロールで下に降りるほど青寄りへ微傾斜
  color.b += uScroll * 0.012;

  // 音エネルギーでわずかに明度リフト
  color *= 1.0 + uAudioEnergy * 0.05;

  gl_FragColor = vec4(color, 1.0);
}

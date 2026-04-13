// Bloom composite: scene (tMap) から高輝度を疑似 Gaussian blur で抽出し、原画像に additive blend
// OGL Post の 1 pass 実装。multipass FBO に頼らず、16 方向 × 3 半径 = 48 samples で十分な glow を作る。

precision highp float;

uniform sampler2D tMap;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 vUv;

void main() {
  vec3 base = texture2D(tMap, vUv).rgb;

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
      // 高輝度のみ採用（threshold smoothstep 0.5 → 0.9）
      bloom += c * smoothstep(0.5, 0.9, br);
    }
  }
  bloom /= 48.0;

  vec3 color = base + bloom * uIntensity;
  gl_FragColor = vec4(color, 1.0);
}

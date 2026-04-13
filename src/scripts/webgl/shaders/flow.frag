// フローフィールド可視化フラグメントシェーダー
// 既存 Canvas 2D 版（drawGrid + drawAurora 相当）を Simplex GPU で代替

precision highp float;

#include './simplex.glsl';

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;       // 画面座標ピクセル
uniform vec2 uResolution;  // 画面サイズピクセル
uniform float uIsDark;     // 0.0 = light, 1.0 = dark

// 4 色パレット（既存 Canvas 2D と同じ）
vec3 paletteSample(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  vec3 a, b;
  float f;
  if (t < 1.0) {
    a = vec3(0.0, 0.776, 1.0);     // #00C6FF cyan
    b = vec3(0.616, 0.314, 0.733); // #9D50BB purple
    f = t;
  } else if (t < 2.0) {
    a = vec3(0.616, 0.314, 0.733);
    b = vec3(1.0, 0.294, 0.122);   // #FF4B1F orange
    f = t - 1.0;
  } else {
    a = vec3(1.0, 0.294, 0.122);
    b = vec3(0.196, 0.196, 0.196); // #323232 dark
    f = t - 2.0;
  }
  return mix(a, b, f);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

  // フローフィールド: ノイズで角度を取り、その方向にサンプリングして streak を作る
  float angle = snoise(p * 0.8 + uTime * 0.05) * 6.28318;
  vec2 dir = vec2(cos(angle), sin(angle));

  float streak = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = float(i) * 0.1;
    streak += snoise((p + dir * t) * 1.2 + uTime * 0.03);
  }
  streak = (streak / 6.0 + 1.0) * 0.5;

  vec3 color = paletteSample(streak);

  // dark mode 適応
  color = mix(color, color * 0.4 + vec3(0.05), uIsDark);

  // マウス周辺ハイライト
  vec2 mouseNorm = uMouse / uResolution;
  vec2 mp = (mouseNorm - 0.5) * vec2(aspect, 1.0) * 2.0;
  float md = distance(p, mp);
  vec3 mouseHi = vec3(0.3, 0.5, 0.6) * smoothstep(0.55, 0.0, md) * 0.5;
  color += mouseHi;

  // 横方向のオーロラリボン
  float ribbonNoise = snoise(p * 0.3 + uTime * 0.02);
  float ribbon = sin(uv.y * 8.0 + ribbonNoise * 3.14159) * 0.5 + 0.5;
  ribbon = pow(ribbon, 4.0) * 0.15;
  color += paletteSample(streak * 0.8 + 0.2) * ribbon;

  // 透明度: 既存 #tech-canvas.visible の opacity 0.85 と整合
  gl_FragColor = vec4(color, 0.85);
}

// Labs section: domain warping + audio-reactive generative art
// fbm (fractal Brownian motion) を 2 段階ネストして warp させ、
// 深コバルトからクリームへ palette 展開。マウス位置でワープ強度が膨らむ。

precision highp float;

#include './simplex.glsl';

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouseUv;       // 0..1（範囲外だと -1,-1）
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uZoom;  // 1.0 = 通常、> 1 で拡大
uniform vec2 uPan;    // UV 空間のオフセット

float fbm(vec2 p) {
  float a = 0.5;
  float f = 0.0;
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);
  // zoom + pan: 中心基準で scale、その後 UV にパンを適用
  vec2 uv = (vUv - 0.5) / max(0.001, uZoom) + 0.5 + uPan;
  vec2 p = vec2((uv.x - 0.5) * aspect + 0.5, uv.y) * 1.4;

  // マウス位置から半径 mouse influence を計算（マウスが近いと warp が激しくなる）
  vec2 toMouse = uv - uMouseUv;
  toMouse.x *= aspect;
  float mouseDist = length(toMouse);
  float mouseKick = smoothstep(0.45, 0.0, mouseDist);

  // 1 段目: 基本ベクトル場
  float t = uTime * 0.06;
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t),
    fbm(p + vec2(5.2, 1.3) - t * 0.7)
  );

  // 2 段目: q を使って warp、音中域でスケール強度
  float warpStrength = 2.2 + uAudioMid * 2.0 + mouseKick * 3.5;
  vec2 r = vec2(
    fbm(p + warpStrength * q + vec2(1.7, 9.2) + uTime * 0.1),
    fbm(p + warpStrength * q + vec2(8.3, 2.8) + uTime * 0.08)
  );

  float f = fbm(p + warpStrength * r);
  // 正規化 + 音高域でコントラスト
  f = clamp((f + 1.0) * 0.5, 0.0, 1.0);
  f = pow(f, 1.0 - uAudioHigh * 0.3);

  // Palette: 深コバルト → dusty → cream
  vec3 deep  = vec3(0.055, 0.12, 0.22);   // 影
  vec3 cobalt = vec3(0.15, 0.27, 0.42);   // 中
  vec3 dusty = vec3(0.48, 0.60, 0.72);    // 上
  vec3 cream = vec3(0.95, 0.93, 0.89);    // ハイライト

  vec3 color;
  if (f < 0.35) {
    color = mix(deep, cobalt, f / 0.35);
  } else if (f < 0.65) {
    color = mix(cobalt, dusty, (f - 0.35) / 0.30);
  } else {
    color = mix(dusty, cream, (f - 0.65) / 0.35);
  }

  // 低域で全体の明度を呼吸
  color *= 1.0 + uAudioBass * 0.15;

  // マウスの近傍でハイライト
  color += vec3(0.08, 0.10, 0.14) * mouseKick * 0.5;

  // subtle vignette
  vec2 c = uv - 0.5;
  float vig = 1.0 - smoothstep(0.4, 0.75, length(c * vec2(aspect, 1.0)));
  color *= 0.75 + vig * 0.25;

  gl_FragColor = vec4(color, 1.0);
}

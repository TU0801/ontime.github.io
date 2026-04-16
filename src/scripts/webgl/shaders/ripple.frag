// Hero ink-pool ripple fragment shader
// 波の高さでハイライトと影を作り、墨の輝きを表現。

precision highp float;

varying vec2 vUv;
varying float vRipple;

uniform float uTime;
uniform float uAudioEnergy;

void main() {
  // 波の高さをトーン差に変換
  float highlight = smoothstep(0.0, 0.03, vRipple);
  float shadow    = smoothstep(0.0, 0.03, -vRipple);

  vec3 base      = vec3(0.10, 0.16, 0.26);   // 深コバルト
  vec3 crest     = vec3(0.72, 0.78, 0.86);   // 波の頭で明るく
  vec3 trough    = vec3(0.03, 0.06, 0.11);   // 谷は更に濃く

  vec3 color = base;
  color = mix(color, crest, highlight * 0.55);
  color = mix(color, trough, shadow * 0.55);

  // 音エネルギーで全体を微かにブースト
  color *= 1.0 + uAudioEnergy * 0.08;

  // 中央で最大、エッジで 0 にフェード（端を自然に溶かす）
  vec2 c = vUv - 0.5;
  float edgeFalloff = 1.0 - smoothstep(0.22, 0.52, length(c));
  float alpha = edgeFalloff * 0.35;

  // 波が強いところはアルファも持ち上げる
  alpha += abs(vRipple) * 3.0 * edgeFalloff;

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.75));
}

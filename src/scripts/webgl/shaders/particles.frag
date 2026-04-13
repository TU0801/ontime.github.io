// GPU パーティクル fragment shader
// 円形 sprite + ガウシアン風フォールオフ

precision highp float;

varying float vAlpha;
varying vec3 vColor;

void main() {
  // gl_PointCoord は gl.POINTS 描画時に [0..1] で fragment 座標を返す
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  float alpha = (1.0 - smoothstep(0.2, 0.5, r)) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}

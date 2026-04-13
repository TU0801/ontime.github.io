precision highp float;

varying vec2 vUv;
uniform float uTime;

void main() {
  vec3 color = vec3(
    0.5 + 0.5 * sin(uTime + vUv.x * 6.28318),
    0.5 + 0.5 * cos(uTime * 0.7 + vUv.y * 6.28318),
    0.5
  );
  gl_FragColor = vec4(color, 1.0);
}

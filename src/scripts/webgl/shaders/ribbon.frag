// リボン trail fragment shader
// age から alpha を減衰、head 側にハイライト、tail 側に深コバルト

precision highp float;

varying float vAge;

uniform float uTime;
uniform float uAudioEnergy;
uniform float uScrollVelocity;

void main() {
  // age: 0 (head) → 1 (tail)。head 側に濃く、tail に向かって滑らかに消える
  float alpha = 1.0 - vAge;
  alpha = pow(alpha, 1.4);

  // ブランドの筆致モチーフに合わせて深コバルトの濃淡だけで描く
  vec3 head = vec3(0.14, 0.24, 0.40);
  vec3 tail = vec3(0.06, 0.11, 0.20);
  vec3 color = mix(head, tail, vAge);

  // 音・スクロール速度で濃度を押し上げる（ビートや勢いで筆圧が増す）
  float pressure = 0.78 + uAudioEnergy * 0.22 + abs(uScrollVelocity) * 0.4;
  alpha *= pressure;

  // わずかに時間で脈動（呼吸）
  float breathe = 0.94 + 0.06 * sin(uTime * 1.4);
  alpha *= breathe;

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.88));
}

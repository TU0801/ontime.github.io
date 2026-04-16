// リボン trail vertex shader
// NDC positionを直接受け取り、age を varying で渡すだけ

attribute vec2 position;
attribute float age;

varying float vAge;

void main() {
  vAge = age;
  gl_Position = vec4(position, 0.0, 1.0);
}

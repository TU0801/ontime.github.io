/// <reference types="astro/client" />
/// <reference types="vite-plugin-glsl/ext" />

// vite-plugin-glsl が string import できるようにする ambient declaration（保険）
declare module '*.glsl' {
  const value: string;
  export default value;
}
declare module '*.frag' {
  const value: string;
  export default value;
}
declare module '*.vert' {
  const value: string;
  export default value;
}

// labs-canvas の外部操作 API facade。
// labs-canvas.ts が heavy（ogl 依存）なので、labs-explorer.ts からの static import を
// こちらに集約することで、bundler が labs-canvas を正しく dynamic chunk に分離できる。

export type LabsControls = {
  setZoom(z: number): void;
  setPan(x: number, y: number): void;
  getZoom(): number;
  getPan(): [number, number];
};

let shared: LabsControls | null = null;

export function setLabsControls(c: LabsControls | null): void {
  shared = c;
}

export function getLabsControls(): LabsControls | null {
  return shared;
}

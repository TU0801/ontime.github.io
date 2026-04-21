// UI サウンド facade。ambient.ts が startAmbient 時に ui-sounds-impl を動的に
// 読み込んで register してくれる。ambient OFF の間は playUiSound は no-op。
// command-palette / modal からは本ファイルを static import する — tone は bundle に入らない。

export type SoundKind = 'open' | 'close' | 'click' | 'hover' | 'select';

type PlayFn = (kind: SoundKind) => void;

let impl: PlayFn | null = null;

export function registerUiSoundImpl(fn: PlayFn): void {
  impl = fn;
}

export function clearUiSoundImpl(): void {
  impl = null;
}

export function playUiSound(kind: SoundKind): void {
  impl?.(kind);
}

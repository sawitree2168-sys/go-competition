declare module "@/lib/avatar-crop.mjs" {
  export function avatarCropRect(width: number, height: number, zoom?: number, offsetX?: number, offsetY?: number): {
    x: number; y: number; width: number; height: number;
  };
}

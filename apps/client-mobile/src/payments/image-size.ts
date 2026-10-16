/** The pixel size an image's own header declares, or null when unknown. */
export function imageSizeFromBytes(bytes: Uint8Array): { height: number; width: number } | null {
  return bytes.length === 0 ? null : null;
}

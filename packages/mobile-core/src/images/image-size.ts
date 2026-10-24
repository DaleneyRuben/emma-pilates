const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
// JPEG start-of-frame markers; C4 (Huffman), C8, and CC (arithmetic) are not frames.
const jpegFrames = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** The pixel size a PNG or JPEG declares in its own header, or null when unknown. */
export function imageSizeFromBytes(bytes: Uint8Array): { height: number; width: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length >= 24 && pngSignature.every((value, index) => bytes[index] === value)) {
    return { height: view.getUint32(20), width: view.getUint32(16) };
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1] ?? 0;
      if (jpegFrames.has(marker)) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + view.getUint16(offset + 2);
    }
  }

  return null;
}

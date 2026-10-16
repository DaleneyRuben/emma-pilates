import { imageSizeFromBytes } from "./image-size";
import { pngHeader } from "./purchase-test-support";

// A JPEG start, an APP0 segment, and an SOF0 frame for the given size.
function jpegHeader(width: number, height: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array<number>(14).fill(0)];
  const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, ...new Array<number>(9).fill(0)]);
}

// MOB-062: the studio QR is measured from its own bytes, because Android does
// not measure a data URI.
describe("imageSizeFromBytes", () => {
  it("reads a PNG's size", () => {
    expect(imageSizeFromBytes(pngHeader(420, 600))).toEqual({ height: 600, width: 420 });
  });

  it("reads a JPEG's size", () => {
    expect(imageSizeFromBytes(jpegHeader(800, 400))).toEqual({ height: 400, width: 800 });
  });

  it("answers null for anything else", () => {
    expect(imageSizeFromBytes(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

import { decodeBase64, encodeBase64 } from "./base64";

describe("base64", () => {
  it("round-trips bytes and matches the standard alphabet with padding", () => {
    const bytes = new Uint8Array([255, 0, 127, 1, 2]);

    expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    expect(Array.from(decodeBase64(encodeBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
    expect(encodeBase64(new Uint8Array([]))).toBe("");
    expect(Array.from(decodeBase64("aGk="))).toEqual([104, 105]);
  });
});

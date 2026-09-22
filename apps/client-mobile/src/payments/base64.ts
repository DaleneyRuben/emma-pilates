const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Hermes has no Buffer and its atob/btoa are byte-unsafe for binary data,
// so receipts and checksums go through these two small codecs.
export function encodeBase64(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk =
      (bytes[index] << 16) |
      ((bytes[index + 1] ?? 0) << 8) |
      (bytes[index + 2] ?? 0);
    output += alphabet[(chunk >> 18) & 63] + alphabet[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[chunk & 63] : "=";
  }
  return output;
}

export function decodeBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const values = [0, 1, 2, 3].map((offset) =>
      alphabet.indexOf(clean[index + offset] ?? "A"),
    );
    const chunk =
      (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];
    bytes.push((chunk >> 16) & 255);
    if (index + 2 < clean.length) bytes.push((chunk >> 8) & 255);
    if (index + 3 < clean.length) bytes.push(chunk & 255);
  }
  return new Uint8Array(bytes);
}

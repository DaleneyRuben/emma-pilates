// Prisma Bytes columns require a Uint8Array backed by a plain ArrayBuffer,
// which Node Buffers and hash digests do not guarantee.
export const toPrismaBytes = (value: Uint8Array): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(value.byteLength);
  bytes.set(value);

  return bytes;
};

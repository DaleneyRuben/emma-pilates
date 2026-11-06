import { createHash } from 'node:crypto';

type DeclaredPdf = {
  mediaType: 'application/pdf';
  byteSize: number;
  checksum: Uint8Array;
};

type VerifiedPdf = {
  mediaType: 'application/pdf';
  byteSize: number;
  checksum: Buffer;
  width: number;
  height: number;
};

const header = Buffer.from('%PDF-');
const trailer = Buffer.from('%%EOF');
// Writers may append a few bytes of whitespace or an incremental-update
// comment after the last %%EOF; 1 KiB is generous.
const trailerWindow = 1024;

// FIX-044: an issued invoice may be a PDF. sharp cannot read PDFs, so the
// worker checks the declaration (size, SHA-256) and the PDF envelope: the
// header at byte 0 and an end-of-file marker near the end. The file is then
// kept as is; its pages are drawn only when an app asks for them (ADR-0110).
export const verifyPdfBytes = (
  bytes: Buffer,
  declared: DeclaredPdf,
): VerifiedPdf => {
  if (bytes.byteLength !== declared.byteSize) {
    throw new Error('image_size_mismatch');
  }

  const checksum = createHash('sha256').update(bytes).digest();
  if (!checksum.equals(Buffer.from(declared.checksum))) {
    throw new Error('image_checksum_mismatch');
  }

  const tail = bytes.subarray(Math.max(0, bytes.byteLength - trailerWindow));
  if (
    !bytes.subarray(0, header.byteLength).equals(header) ||
    !tail.includes(trailer)
  ) {
    throw new Error('image_decode_failed');
  }

  return {
    mediaType: 'application/pdf',
    byteSize: bytes.byteLength,
    checksum,
    width: 0,
    height: 0,
  };
};

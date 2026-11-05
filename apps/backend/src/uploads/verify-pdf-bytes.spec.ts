import { createHash } from 'node:crypto';
import { verifyPdfBytes } from './verify-pdf-bytes';

const pdf = (body = 'BT /F1 12 Tf (Factura) Tj ET'): Buffer =>
  Buffer.from(
    `%PDF-1.7\n1 0 obj\n<< >>\nstream\n${body}\nendstream\nendobj\n%%EOF\n`,
  );

const checksumOf = (bytes: Buffer): Buffer =>
  createHash('sha256').update(bytes).digest();

const declared = (bytes: Buffer) => ({
  mediaType: 'application/pdf' as const,
  byteSize: bytes.byteLength,
  checksum: checksumOf(bytes),
});

describe('verifyPdfBytes', () => {
  it('accepts a PDF that matches its declaration, with no pixel size', () => {
    const bytes = pdf();

    expect(verifyPdfBytes(bytes, declared(bytes))).toEqual({
      mediaType: 'application/pdf',
      byteSize: bytes.byteLength,
      checksum: checksumOf(bytes),
      width: 0,
      height: 0,
    });
  });

  it('accepts trailing whitespace after the end-of-file marker', () => {
    const bytes = Buffer.concat([pdf(), Buffer.from('\r\n\n  ')]);

    expect(verifyPdfBytes(bytes, declared(bytes)).byteSize).toBe(
      bytes.byteLength,
    );
  });

  it('refuses bytes whose size differs from the declaration', () => {
    const bytes = pdf();

    expect(() =>
      verifyPdfBytes(bytes, { ...declared(bytes), byteSize: 1 }),
    ).toThrow('image_size_mismatch');
  });

  it('refuses bytes whose checksum differs from the declaration', () => {
    const bytes = pdf();

    expect(() =>
      verifyPdfBytes(bytes, {
        ...declared(bytes),
        checksum: checksumOf(pdf('x')),
      }),
    ).toThrow('image_checksum_mismatch');
  });

  it('refuses a file that does not start with the PDF header', () => {
    const bytes = Buffer.from('<html>%%EOF</html>\n%%EOF\n');

    expect(() => verifyPdfBytes(bytes, declared(bytes))).toThrow(
      'image_decode_failed',
    );
  });

  it('refuses a truncated PDF without the end-of-file marker', () => {
    const bytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\n');

    expect(() => verifyPdfBytes(bytes, declared(bytes))).toThrow(
      'image_decode_failed',
    );
  });
});

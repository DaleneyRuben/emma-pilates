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

export const verifyPdfBytes: (
  bytes: Buffer,
  declared: DeclaredPdf,
) => VerifiedPdf = () => {
  throw new Error('not implemented');
};

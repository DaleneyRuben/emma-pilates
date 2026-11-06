import {
  validateImageUploadDeclaration,
  type ImagePurpose,
} from './image-purpose';
import {
  verifyImageBytes,
  type VerifiableMediaType,
} from './verify-image-bytes';
import { verifyPdfBytes } from './verify-pdf-bytes';

type DeclaredUpload = {
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
};

type VerifiedUpload = {
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
  width: number;
  height: number;
};

// The worker's check of an uploaded object against its declaration: the
// purpose's rules first (a PDF only for an invoice, FIX-044), then the
// bytes, as a PDF envelope or as a decodable image.
export const verifyUploadBytes = async (
  bytes: Buffer,
  declared: DeclaredUpload,
  purpose: ImagePurpose,
): Promise<VerifiedUpload> => {
  const { maxAxisPixels } = validateImageUploadDeclaration({
    purpose,
    mediaType: declared.mediaType,
    byteSize: declared.byteSize,
    checksum: declared.checksum,
  });

  if (declared.mediaType === 'application/pdf') {
    return verifyPdfBytes(bytes, {
      mediaType: 'application/pdf',
      byteSize: declared.byteSize,
      checksum: declared.checksum,
    });
  }

  return verifyImageBytes(
    bytes,
    {
      mediaType: declared.mediaType as VerifiableMediaType,
      byteSize: declared.byteSize,
      checksum: declared.checksum,
    },
    maxAxisPixels,
  );
};

import type { S3ClientConfig } from '@aws-sdk/client-s3';

export type S3Connection = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

// Cloudflare R2's S3 API (ADR-0088) and the S3-compatible servers the tests
// use: path-style addressing, and integrity checksums only where the
// operation requires them, since R2 rejects the SDK's newer defaults on some
// calls.
export const s3ClientConfig = (connection: S3Connection): S3ClientConfig => ({
  endpoint: connection.endpoint,
  region: connection.region,
  credentials: {
    accessKeyId: connection.accessKeyId,
    secretAccessKey: connection.secretAccessKey,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

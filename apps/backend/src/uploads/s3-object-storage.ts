import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { assertStorageKey, type ObjectStorage } from './object-storage';

type S3Client = { send(command: unknown): Promise<unknown> };

type GetObjectAnswer = {
  Body?: { transformToByteArray(): Promise<Uint8Array> };
};

// Production storage on Cloudflare R2's S3 API (ADR-0026, ADR-0088).
export class S3ObjectStorage implements ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, bytes: Buffer): Promise<void> {
    assertStorageKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        IfNoneMatch: '*',
      }),
    );
  }

  async replace(key: string, bytes: Buffer): Promise<void> {
    assertStorageKey(key);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes }),
    );
  }

  async get(key: string): Promise<Buffer> {
    assertStorageKey(key);
    const answer = (await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as GetObjectAnswer;
    if (answer.Body === undefined) throw new Error('storage_object_missing');
    return Buffer.from(await answer.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    assertStorageKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

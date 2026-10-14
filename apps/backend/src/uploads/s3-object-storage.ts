type S3Client = { send(command: unknown): Promise<unknown> };

export class S3ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  put(key: string, bytes: Buffer): Promise<void> {
    return Promise.reject(new Error(`not implemented ${key} ${bytes.length}`));
  }

  replace(key: string, bytes: Buffer): Promise<void> {
    return Promise.reject(new Error(`not implemented ${key} ${bytes.length}`));
  }

  get(key: string): Promise<Buffer> {
    return Promise.reject(new Error(`not implemented ${key}`));
  }

  delete(key: string): Promise<void> {
    return Promise.reject(new Error(`not implemented ${key}`));
  }
}

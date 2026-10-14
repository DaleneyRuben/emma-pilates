import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3ObjectStorage } from './s3-object-storage';

type SentCommand = { constructor: unknown; input: Record<string, unknown> };

const fakeClient = (answer: (command: SentCommand) => unknown = () => ({})) => {
  const sent: SentCommand[] = [];
  return {
    sent,
    client: {
      send: (command: SentCommand) => {
        sent.push(command);
        return Promise.resolve(answer(command));
      },
    },
  };
};

describe('S3ObjectStorage', () => {
  it('writes a new object only when the key is still free', async () => {
    const { sent, client } = fakeClient();
    const storage = new S3ObjectStorage(client, 'images');

    await storage.put('pending/transfer_receipt/abc', Buffer.from('bytes'));

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'images',
      Key: 'pending/transfer_receipt/abc',
      Body: Buffer.from('bytes'),
      IfNoneMatch: '*',
    });
  });

  it('overwrites through replace, so a retried rebuild reuses its keys', async () => {
    const { sent, client } = fakeClient();
    const storage = new S3ObjectStorage(client, 'images');

    await storage.replace('private/receipt/abc/readable', Buffer.from('two'));

    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'images',
      Key: 'private/receipt/abc/readable',
      Body: Buffer.from('two'),
    });
  });

  it('reads an object back as a buffer', async () => {
    const { sent, client } = fakeClient(() => ({
      Body: {
        transformToByteArray: () =>
          Promise.resolve(new Uint8Array(Buffer.from('stored'))),
      },
    }));
    const storage = new S3ObjectStorage(client, 'images');

    await expect(storage.get('private/receipt/abc/readable')).resolves.toEqual(
      Buffer.from('stored'),
    );
    expect(sent[0]).toBeInstanceOf(GetObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'images',
      Key: 'private/receipt/abc/readable',
    });
  });

  it('fails a read that returns no body', async () => {
    const { client } = fakeClient(() => ({}));
    const storage = new S3ObjectStorage(client, 'images');

    await expect(storage.get('private/receipt/abc/readable')).rejects.toThrow(
      'storage_object_missing',
    );
  });

  it('deletes by key', async () => {
    const { sent, client } = fakeClient();
    const storage = new S3ObjectStorage(client, 'images');

    await storage.delete('pending/promotion/abc');

    expect(sent[0]).toBeInstanceOf(DeleteObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'images',
      Key: 'pending/promotion/abc',
    });
  });

  it('refuses a key outside the opaque key alphabet before calling the store', async () => {
    const { sent, client } = fakeClient();
    const storage = new S3ObjectStorage(client, 'images');

    await expect(storage.get('../outside')).rejects.toThrow(
      'storage_key_invalid',
    );
    await expect(
      storage.put('Pending/Upper', Buffer.from('x')),
    ).rejects.toThrow('storage_key_invalid');
    expect(sent).toHaveLength(0);
  });
});

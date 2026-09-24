import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalObjectStorage } from './local-object-storage';

describe('LocalObjectStorage', () => {
  it('keeps stored bytes addressable only by their opaque key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pilates-uploads-'));
    const storage = new LocalObjectStorage(root);

    try {
      await storage.put('pending/asset/original', Buffer.from('safe bytes'));
      await expect(storage.get('pending/asset/original')).resolves.toEqual(
        Buffer.from('safe bytes'),
      );
      await expect(storage.get('../outside')).rejects.toThrow(
        'storage_key_invalid',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite through put but replaces through replace, so a retried rebuild reuses its keys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pilates-uploads-'));
    const storage = new LocalObjectStorage(root);

    try {
      await storage.put('private/receipt/asset/readable', Buffer.from('one'));
      await expect(
        storage.put('private/receipt/asset/readable', Buffer.from('two')),
      ).rejects.toThrow();
      await storage.replace(
        'private/receipt/asset/readable',
        Buffer.from('two'),
      );
      await expect(
        storage.get('private/receipt/asset/readable'),
      ).resolves.toEqual(Buffer.from('two'));
      await storage.replace('private/receipt/asset/fresh', Buffer.from('new'));
      await expect(storage.get('private/receipt/asset/fresh')).resolves.toEqual(
        Buffer.from('new'),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

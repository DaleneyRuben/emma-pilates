import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const resolveKey = (root: string, key: string): string => {
  if (!/^[a-z0-9][a-z0-9/_-]*$/.test(key)) {
    throw new Error('storage_key_invalid');
  }

  const resolvedRoot = resolve(root);
  const path = resolve(resolvedRoot, key);
  if (!path.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error('storage_key_invalid');
  }
  return path;
};

export class LocalObjectStorage {
  constructor(private readonly root: string) {}

  async put(key: string, bytes: Buffer): Promise<void> {
    const path = resolveKey(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: 'wx' });
  }

  // Rebuilt variants reuse one key per asset and kind, so a retried job
  // overwrites its own partial output (ADR-0073); pending uploads never do.
  async replace(key: string, bytes: Buffer): Promise<void> {
    const path = resolveKey(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(resolveKey(this.root, key));
  }

  async delete(key: string): Promise<void> {
    await rm(resolveKey(this.root, key), { force: true });
  }
}

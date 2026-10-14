import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

// Streams the dump once, so its size never has to fit in memory.
export const describeFile = async (
  path: string,
): Promise<{ size: number; sha256: string }> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return { size: (await stat(path)).size, sha256: hash.digest('hex') };
};

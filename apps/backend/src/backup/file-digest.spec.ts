import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeFile } from './file-digest';

describe('describeFile (EXT-009)', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pilates-digest-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('reports the size and SHA-256 of a file', async () => {
    const bytes = Buffer.alloc(200_000, 7);
    const path = join(directory, 'emma.dump');
    await writeFile(path, bytes);

    await expect(describeFile(path)).resolves.toEqual({
      size: 200_000,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  });
});

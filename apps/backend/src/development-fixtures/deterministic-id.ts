import { createHash } from 'node:crypto';

export const deterministicId = (key: string): string => {
  const digest = createHash('sha256')
    .update(`pilates-development-fixture:${key}`)
    .digest('hex');
  const versioned = `${digest.slice(0, 12)}5${digest.slice(13, 16)}`;
  const variant = ((parseInt(digest[16], 16) & 0x3) | 0x8).toString(16);

  return [
    versioned.slice(0, 8),
    versioned.slice(8, 12),
    versioned.slice(12, 16),
    `${variant}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
};

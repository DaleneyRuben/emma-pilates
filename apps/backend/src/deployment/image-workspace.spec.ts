import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dockerfile = readFileSync(
  path.resolve(__dirname, '../../Dockerfile'),
  'utf8',
);

// The image copies each workspace manifest by hand. A package the lockfile
// names and the Dockerfile misses fails `pnpm install --frozen-lockfile`
// (Northflank migrate build quickest-grape-4221, release ea883a4d).
describe('the backend image workspace', () => {
  it('copies every workspace package manifest before the frozen install', () => {
    const packages = readdirSync(path.resolve(__dirname, '../../../../packages'));
    const missing = packages.filter(
      (name) => !dockerfile.includes(`COPY packages/${name}/package.json`),
    );
    expect(missing).toEqual([]);
  });
});

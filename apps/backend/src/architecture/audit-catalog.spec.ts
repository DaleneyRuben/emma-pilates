import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const sourceRoot = resolve(__dirname, '..');
const catalogPath = resolve(
  __dirname,
  '../../../../docs/security/audit-event-catalog.md',
);

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'generated' ? [] : sourceFiles(path);
    }
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });

// Every code literal inside an `actionCode` value, ternary, or union type.
const writtenCodes = (): Set<string> => {
  const codes = new Set<string>();
  sourceFiles(sourceRoot).forEach((file) => {
    const text = readFileSync(file, 'utf8');
    for (const field of text.matchAll(/actionCode\??:([\s\S]*?)[,;]\s*\n/g)) {
      for (const code of field[1].matchAll(/'([a-z_]+\.[a-z_]+)'/g)) {
        codes.add(code[1]);
      }
    }
  });
  return codes;
};

const cataloguedCodes = (): Set<string> => {
  const catalog = readFileSync(catalogPath, 'utf8');
  const section = catalog.split('## Catalog')[1]?.split('\n## ')[0] ?? '';
  return new Set(
    [...section.matchAll(/^\| `([a-z_]+\.[a-z_]+)` \|/gm)].map(
      (match) => match[1],
    ),
  );
};

describe('audit event catalog', () => {
  it('lists exactly the action codes the backend writes', () => {
    expect([...writtenCodes()].sort()).toEqual([...cataloguedCodes()].sort());
  });
});

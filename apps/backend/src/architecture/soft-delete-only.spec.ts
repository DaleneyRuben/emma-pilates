import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const sourceRoot = resolve(process.cwd(), 'src');

// ADR-0086: no database row is ever physically deleted. Object-storage bytes
// are not database rows, so `storage.delete(key)` stays allowed.
const physicalDeletes = [
  /(?<!storage)\.(delete|deleteMany)\s*\(/,
  /\bDELETE\s+FROM\b/,
  /\bTRUNCATE\b/,
];

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'generated' ? [] : listSourceFiles(path);
    }
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });

describe('soft delete only', () => {
  it('never physically deletes a database row in production code', () => {
    const offenders = listSourceFiles(sourceRoot).flatMap((path) =>
      readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          physicalDeletes.some((pattern) => pattern.test(line))
            ? [`${relative(sourceRoot, path)}:${index + 1}: ${line.trim()}`]
            : [],
        ),
    );

    expect(offenders).toEqual([]);
  });
});

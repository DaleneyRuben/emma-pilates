import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const sourceRoot = resolve(process.cwd(), 'src');

// Bounded contexts own their models and commands; they may only reach each
// other through the edges listed here.
const contexts = [
  'back-office',
  'booking',
  'notifications',
  'system-identity',
  'uploads',
];
const allowedContextEdges: Record<string, string[]> = {
  // Back Office reads Branches and Staff Members through its own read-only
  // queries (ADR-0011) and imports no other context.
  'back-office': [],
  // Booking records notifications and streams receipt objects through the
  // uploads storage port.
  booking: ['notifications', 'uploads'],
  notifications: [],
  'system-identity': [],
  uploads: [],
};
// Every context may authenticate callers through the shared authentication
// slice and wire its provider by importing the System Identity Nest module.
const sharedContextSlices = [
  'system-identity/authentication',
  'system-identity/system-identity.module',
  // Registration attributes the referrer inside its own transaction through
  // this Booking-owned slice (PAY-001 decision d).
  'booking/payments/referral-attribution',
  // Staff management creates, reissues, and disables the Staff Member's
  // Account inside its own transaction through this System Identity slice
  // (IDN-007).
  'system-identity/staff-accounts',
  // Closing a Client's Account revokes its sessions and marks the Account
  // removed inside the Booking & Membership closure transaction (BE-007).
  'system-identity/account-closure',
];
// Shared kernel folders may depend on each other but never on a context.
const sharedKernel = [
  'config',
  'database',
  'generated',
  'health',
  'http',
  'jobs',
  'openapi',
  'time',
];
// Composition roots wire everything together.
const compositionRoots = ['architecture', 'development-fixtures'];

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });

const segments = (path: string): string[] =>
  relative(sourceRoot, path).split(sep);

const owner = (path: string): string | null => {
  const parts = segments(path);
  return parts.length > 1 ? parts[0] : null;
};

const relativeImports = (path: string): string[] =>
  [...readFileSync(path, 'utf8').matchAll(/from '(\.[^']*)'/g)].map(
    (match) => match[1],
  );

const violations: string[] = [];

for (const file of listSourceFiles(sourceRoot)) {
  const from = owner(file);
  if (from === null || compositionRoots.includes(from)) continue;

  for (const specifier of relativeImports(file)) {
    const targetPath = resolve(dirname(file), specifier);
    const targetParts = segments(targetPath);
    const target = targetParts[0];
    const targetModule = targetParts.join('/');
    const inSharedSlice = sharedContextSlices.some(
      (slice) => targetModule === slice || targetModule.startsWith(`${slice}/`),
    );
    if (target === from || target === '..') continue;

    // Root-level files are composition roots; only kernel scripts may read them.
    const targetsCompositionRoot = targetParts.length === 1;
    const allowed =
      (targetsCompositionRoot && sharedKernel.includes(from)) ||
      (!targetsCompositionRoot && sharedKernel.includes(target)) ||
      (contexts.includes(from) &&
        (allowedContextEdges[from].includes(target) || inSharedSlice));

    if (!allowed) {
      violations.push(
        `${relative(sourceRoot, file)} -> ${relative(sourceRoot, targetPath)}`,
      );
    }
  }
}

describe('bounded context boundaries', () => {
  it('lists every context and shared kernel folder that exists', () => {
    const folders = readdirSync(sourceRoot).filter((entry) =>
      statSync(join(sourceRoot, entry)).isDirectory(),
    );
    const known = [...contexts, ...sharedKernel, ...compositionRoots];

    expect(folders.filter((folder) => !known.includes(folder))).toEqual([]);
  });

  it('keeps contexts from importing each other outside the allowed edges', () => {
    expect(violations.sort()).toEqual([]);
  });
});

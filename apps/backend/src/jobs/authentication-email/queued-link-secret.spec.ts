import { readQueuedLinkSecret } from './queued-link-secret';

const now = new Date('2026-10-15T12:00:00.000Z');
const accountId = '11111111-1111-4111-8111-111111111111';
const older = '22222222-2222-4222-8222-222222222222';
const newer = '33333333-3333-4333-8333-333333333333';

const job = (tokenId: string, createdOn: string, purpose = 'verification') => ({
  createdOn: new Date(createdOn),
  data: {
    version: 1,
    accountId,
    authenticationTokenId: tokenId,
    purpose,
    encryptedLinkSecret: `sealed-${tokenId}`,
    encryptionKeyId: 'prod-v1',
  },
});

const token = (overrides: object = {}) => ({
  accountId,
  email: 'clienta@example.com',
  pendingEmail: null,
  purpose: 'verification' as const,
  expiresAt: new Date('2026-10-16T00:00:00.000Z'),
  usedAt: null,
  invalidatedAt: null,
  ...overrides,
});

const read = (
  jobs: ReturnType<typeof job>[],
  tokens: Record<string, ReturnType<typeof token> | null>,
  recipient?: string,
) =>
  readQueuedLinkSecret({
    purpose: 'verification',
    ...(recipient === undefined ? {} : { recipient }),
    queuedJobs: () => Promise.resolve(jobs),
    stateReader: { find: (id: string) => Promise.resolve(tokens[id] ?? null) },
    decryptor: {
      decrypt: (ciphertext: string) =>
        Promise.resolve(ciphertext.replace('sealed-', 'secret/')),
    },
    now,
  });

// REL-006: until EXT-001 sends email, an operator shell reads the secret of
// a queued link with the worker's own currency checks; nothing is delivered.
describe('readQueuedLinkSecret', () => {
  it('reads the newest current secret of the requested purpose', async () => {
    await expect(
      read(
        [
          job(older, '2026-10-15T10:00:00Z'),
          job(newer, '2026-10-15T11:00:00Z'),
        ],
        { [older]: token(), [newer]: token() },
      ),
    ).resolves.toBe(`secret/${newer}`);
  });

  it('skips jobs of another purpose and links that are no longer current', async () => {
    await expect(
      read(
        [
          job(older, '2026-10-15T10:00:00Z'),
          job(newer, '2026-10-15T11:00:00Z', 'activation'),
        ],
        {
          [older]: token(),
          [newer]: token({ purpose: 'activation' }),
        },
      ),
    ).resolves.toBe(`secret/${older}`);

    await expect(
      read([job(older, '2026-10-15T10:00:00Z')], {
        [older]: token({ usedAt: now }),
      }),
    ).resolves.toBeNull();
  });

  it("reads only the named recipient's link, ignoring the address's case", async () => {
    const jobs = [
      job(older, '2026-10-15T10:00:00Z'),
      job(newer, '2026-10-15T11:00:00Z'),
    ];
    const tokens = {
      [older]: token(),
      [newer]: token({ email: 'otra@example.com' }),
    };

    await expect(read(jobs, tokens, 'ClientA@Example.com')).resolves.toBe(
      `secret/${older}`,
    );
    await expect(read(jobs, tokens, 'nadie@example.com')).resolves.toBeNull();
  });
});

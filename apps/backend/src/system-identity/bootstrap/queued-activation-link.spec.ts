import { readQueuedActivationLink } from './queued-activation-link';

const now = new Date('2026-10-14T12:00:00.000Z');
const accountId = '11111111-1111-4111-8111-111111111111';

const job = (tokenId: string, createdOn: string) => ({
  createdOn: new Date(createdOn),
  data: {
    version: 1,
    accountId,
    authenticationTokenId: tokenId,
    purpose: 'activation',
    encryptedLinkSecret: `sealed-${tokenId}`,
    encryptionKeyId: 'prod-v1',
  },
});

const older = '22222222-2222-4222-8222-222222222222';
const newer = '33333333-3333-4333-8333-333333333333';

const currentToken = (overrides: object = {}) => ({
  accountId,
  email: 'owner@example.com',
  pendingEmail: null,
  purpose: 'activation' as const,
  expiresAt: new Date('2026-10-20T00:00:00.000Z'),
  usedAt: null,
  invalidatedAt: null,
  ...overrides,
});

const dependencies = (
  jobs: ReturnType<typeof job>[],
  tokens: Record<string, ReturnType<typeof currentToken> | null>,
) => ({
  queuedActivationJobs: () => Promise.resolve(jobs),
  stateReader: { find: (id: string) => Promise.resolve(tokens[id] ?? null) },
  decryptor: {
    decrypt: (ciphertext: string) =>
      Promise.resolve(ciphertext.replace('sealed-', 'secret/')),
  },
  adminWebOrigin: 'https://emma-pilates-admin.vercel.app',
  now,
});

describe('readQueuedActivationLink (EXT-002, until EXT-001 sends email)', () => {
  it("opens the newest current activation link on the admin web's create-password page", async () => {
    const link = await readQueuedActivationLink(
      dependencies(
        [
          job(older, '2026-10-14T10:00:00Z'),
          job(newer, '2026-10-14T11:00:00Z'),
        ],
        { [older]: currentToken(), [newer]: currentToken() },
      ),
    );

    expect(link).toBe(
      `https://emma-pilates-admin.vercel.app/crear-contrasena?token=secret%2F${newer}`,
    );
  });

  it('skips a link that was invalidated, used, or expired', async () => {
    const link = await readQueuedActivationLink(
      dependencies(
        [
          job(older, '2026-10-14T10:00:00Z'),
          job(newer, '2026-10-14T11:00:00Z'),
        ],
        {
          [older]: currentToken(),
          [newer]: currentToken({ invalidatedAt: now }),
        },
      ),
    );

    expect(link).toContain(`secret%2F${older}`);
  });

  it('answers null when no current activation link is queued', async () => {
    await expect(
      readQueuedActivationLink(
        dependencies([job(older, '2026-10-14T10:00:00Z')], {
          [older]: currentToken({ expiresAt: now }),
        }),
      ),
    ).resolves.toBeNull();
  });
});

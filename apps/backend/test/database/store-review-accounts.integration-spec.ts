import { storeReviewAccounts } from '../../src/script-runner/scripts/store-review-accounts';
import { verifyPassword } from '../../src/system-identity/security/argon2-password-hasher';
import {
  now,
  type PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const clientEmail = 'revision-play@emmapilatesstudio.com';
const trainerEmail = 'revision-staff@emmapilatesstudio.com';

type Logged = { event: string; fields: Record<string, unknown> };

describe('the store-review Accounts script (REL-016)', () => {
  let world: PaymentWorld;

  const run = async (params: Record<string, unknown>, dryRun = false) => {
    const logged: Logged[] = [];
    await storeReviewAccounts.run({
      prisma: world.prisma,
      params,
      dryRun,
      now: () => now,
      log: (event, fields = {}) => logged.push({ event, fields }),
    });
    return logged;
  };
  const passwordOf = (logged: Logged[], email: string) =>
    logged.find(
      (entry) =>
        entry.event === 'store_review_account_ready' &&
        entry.fields.email === email,
    )?.fields.password as string;
  const accountOf = (email: string) =>
    world.prisma.account.findFirst({
      where: { email, deletedAt: null },
      select: {
        passwordHash: true,
        emailVerifiedAt: true,
        activatedAt: true,
        storeReview: true,
        client: { select: { id: true, name: true } },
        staffMember: {
          select: { role: true, branchAssignments: { select: { id: true } } },
        },
      },
    });

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('requires both emails', () => {
    expect(storeReviewAccounts.requiredParams).toEqual([
      'clientEmail',
      'trainerEmail',
    ]);
  });

  it('writes nothing on a dry run', async () => {
    const logged = await run({ clientEmail, trainerEmail }, true);

    expect(await accountOf(clientEmail)).toBeNull();
    expect(await accountOf(trainerEmail)).toBeNull();
    expect(logged.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(['store_review_dry_run']),
    );
    expect(JSON.stringify(logged)).not.toContain('password');
  });

  it('makes a verified Client with the tester Plan and a Trainer without classes, both marked', async () => {
    const logged = await run({
      clientEmail,
      trainerEmail,
      endsOn: '2026-12-31',
    });

    const client = await accountOf(clientEmail);
    expect(client).toMatchObject({
      emailVerifiedAt: now,
      activatedAt: now,
      storeReview: true,
      client: { name: 'Revisión Google Play' },
      staffMember: null,
    });
    expect(
      await verifyPassword(
        client!.passwordHash!,
        passwordOf(logged, clientEmail),
      ),
    ).toBe(true);
    const subscription = await world.prisma.subscription.findFirstOrThrow({
      where: { clientId: client!.client!.id },
      select: {
        originalClassAllowance: true,
        endsOn: true,
        payment: { select: { method: true, amountDueCentavos: true } },
      },
    });
    expect(subscription).toMatchObject({
      originalClassAllowance: 16,
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
      payment: { method: 'COURTESY', amountDueCentavos: 0 },
    });

    const trainer = await accountOf(trainerEmail);
    expect(trainer).toMatchObject({
      emailVerifiedAt: now,
      activatedAt: now,
      storeReview: true,
      client: null,
      staffMember: { role: 'TRAINER', branchAssignments: [] },
    });
    expect(
      await verifyPassword(
        trainer!.passwordHash!,
        passwordOf(logged, trainerEmail),
      ),
    ).toBe(true);
    expect(
      logged.find((entry) => entry.event === 'store_review_schedule')?.fields
        .upcomingSessions,
    ).toBeGreaterThan(0);
  });

  it('gives fresh passwords on a rerun without new Accounts or a second Plan', async () => {
    const before = await accountOf(clientEmail);

    const logged = await run({ clientEmail, trainerEmail });

    const after = await accountOf(clientEmail);
    expect(after!.client!.id).toBe(before!.client!.id);
    expect(after!.passwordHash).not.toBe(before!.passwordHash);
    expect(
      await verifyPassword(
        after!.passwordHash!,
        passwordOf(logged, clientEmail),
      ),
    ).toBe(true);
    expect(
      await world.prisma.subscription.count({
        where: { clientId: before!.client!.id },
      }),
    ).toBe(1);
    expect(
      await world.prisma.account.count({
        where: { email: { in: [clientEmail, trainerEmail] }, deletedAt: null },
      }),
    ).toBe(2);
  });

  it('never takes over an Account of the wrong kind', async () => {
    await expect(
      run({ clientEmail, trainerEmail: 'lucia@example.com' }),
    ).rejects.toThrow('email_taken');
    await expect(
      run({ clientEmail: 'emma.vargas@example.com', trainerEmail }),
    ).rejects.toThrow('email_taken');
    expect((await accountOf('lucia@example.com'))!.storeReview).toBe(false);
  });

  it('refuses one email for both Accounts before writing anything', async () => {
    const shared = 'revision-unica@emmapilatesstudio.com';

    await expect(
      run({ clientEmail: shared, trainerEmail: shared.toUpperCase() }),
    ).rejects.toThrow('emails_equal');
    expect(await accountOf(shared)).toBeNull();
  });

  it('refuses an email that is not one', async () => {
    await expect(
      run({ clientEmail: 'not-an-email', trainerEmail }),
    ).rejects.toThrow('email_invalid');
  });
});

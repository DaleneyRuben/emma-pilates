import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import {
  closureNow,
  closurePassword,
  ClosureClient,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';

// BE-023 on real PostgreSQL: closing an Account ends the Client's open
// Promotions Consent, and a ticked box carries its time into the Promotion
// Contact (ADR-0098).
const days = (count: number) =>
  new Date(closureNow.getTime() - count * 24 * 60 * 60 * 1_000);

describe('closing an Account with a Promotions Consent (PostgreSQL)', () => {
  let world: ClosureWorld;
  const closure = () =>
    createPrismaAccountClosure(world.prisma, { now: () => closureNow });

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const consent = (
    client: ClosureClient,
    consentedAt: Date,
    withdrawnAt: Date | null = null,
  ) =>
    world.prisma.clientPromotionsConsent.create({
      data: { clientId: client.clientId, consentedAt, withdrawnAt },
    });

  const periods = (client: ClosureClient) =>
    world.prisma.clientPromotionsConsent.findMany({
      where: { clientId: client.clientId },
      orderBy: { consentedAt: 'asc' },
      select: { consentedAt: true, withdrawnAt: true, deletedAt: true },
    });

  it('ends the open consent and keeps its time on the Promotion Contact', async () => {
    const ana = await world.newClient('Ana Justiniano');
    await consent(ana, days(30), days(20));
    await consent(ana, days(10));

    await closure().close(
      {
        clientId: ana.clientId,
        password: closurePassword,
        keepPromotions: true,
      },
      ana.principal,
    );

    await expect(periods(ana)).resolves.toEqual([
      { consentedAt: days(30), withdrawnAt: days(20), deletedAt: null },
      {
        consentedAt: days(10),
        withdrawnAt: closureNow,
        deletedAt: closureNow,
      },
    ]);
    await expect(
      world.prisma.promotionContact.findMany({
        where: { email: ana.email },
        select: { name: true, consentedAt: true },
      }),
    ).resolves.toEqual([{ name: 'Ana Justiniano', consentedAt: days(10) }]);
  });

  it('ends the open consent without a contact when the box is left unticked', async () => {
    const ana = await world.newClient('Ana Justiniano');
    await consent(ana, days(10));

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(periods(ana)).resolves.toEqual([
      {
        consentedAt: days(10),
        withdrawnAt: closureNow,
        deletedAt: closureNow,
      },
    ]);
    await expect(
      world.prisma.promotionContact.count({ where: { email: ana.email } }),
    ).resolves.toBe(0);
  });

  it('ends the open consent when an Administrator closes the Account', async () => {
    const ana = await world.newClient('Ana Justiniano');
    await consent(ana, days(10));

    await closure().close({ clientId: ana.clientId }, world.administrator);

    const [period] = await periods(ana);
    expect(period?.withdrawnAt).toEqual(closureNow);
    const audit = await world.prisma.auditRecord.findFirstOrThrow({
      where: { actionCode: 'account.closed', targetId: ana.accountId },
      select: { metadata: true },
    });
    expect(audit.metadata).toMatchObject({ endedPromotionsConsent: true });
  });
});

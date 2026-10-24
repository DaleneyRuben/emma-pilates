import { PrismaPg } from '@prisma/adapter-pg';
import { boliviaDate } from '../../src/time/bolivia-time';
import { createFirst90DaysJob } from '../../src/booking/first-90-days/prisma-first-90-days';
import { createPrismaContactAlerts } from '../../src/booking/first-90-days/prisma-contact-alerts';
import { listContactAlerts } from '../../src/booking/first-90-days/list-contact-alerts';
import { markClientContacted } from '../../src/booking/first-90-days/mark-contacted';
import { PrismaClient } from '../../src/generated/prisma/client';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  createBookedSession,
  createClientWithPlan,
  first90DaysNow,
} from './first-90-days-test-support';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

const staff = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: [],
  },
});

describe('Contact alerts (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaContactAlerts(prisma);
  const list = (principal: AuthenticatedPrincipal) =>
    listContactAlerts(principal, {
      now: () => first90DaysNow,
      today: boliviaDate,
      findOpen: store().findOpen,
    });
  const mark = (
    clientId: string,
    principal: AuthenticatedPrincipal,
    accountId?: string,
  ) =>
    markClientContacted(
      { clientId },
      accountId === undefined ? principal : { ...principal, accountId },
      { now: () => first90DaysNow, store: store() },
    );

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists an open alert and drops the Client the moment she books', async () => {
    const client = await createClientWithPlan(prisma, {
      name: 'Valeria Quiroga',
      startsOn,
    });
    await createFirst90DaysJob(
      prisma,
      () => first90DaysNow,
      recordNotification,
    ).execute();

    const page = await list(staff('administrator'));
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: client.clientId,
          name: 'Valeria Quiroga',
          reasons: ['no_booking_7_days'],
        }),
      ]),
    );

    await createBookedSession(prisma, {
      clientId: client.clientId,
      subscriptionId: client.subscriptionId,
      accountId: client.accountId,
      createdAt: new Date('2026-10-08T16:00:01.000Z'),
      startsAt: new Date('2026-10-10T15:00:00.000Z'),
    });

    const after = await list(staff('coordinator'));
    expect(after.items.some((item) => item.clientId === client.clientId)).toBe(
      false,
    );
  });

  it('records who marked her and when, and removes her from the list', async () => {
    const client = await createClientWithPlan(prisma, {
      name: 'Mónica Salvatierra',
      startsOn,
    });
    await createFirst90DaysJob(
      prisma,
      () => first90DaysNow,
      recordNotification,
    ).execute();
    const actor = await prisma.staffMember.create({
      data: {
        name: 'Carolina Rivas',
        role: 'COORDINATOR',
        account: { create: { email: 'carolina.rivas@example.test' } },
      },
      include: { account: true },
    });
    const actorAccountId = actor.account?.id;
    if (actorAccountId === undefined) {
      throw new Error('Coordinator Account missing');
    }

    await mark(client.clientId, staff('coordinator'), actorAccountId);

    const alerts = await prisma.contactAlert.findMany({
      where: { clientId: client.clientId },
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        contactedAt: first90DaysNow,
        contactedByAccountId: actorAccountId,
      }),
    ]);
    const audit = await prisma.auditRecord.findFirstOrThrow({
      where: {
        actionCode: 'contact_alert.contacted',
        targetId: client.clientId,
      },
    });
    expect(audit.actorAccountId).toBe(actorAccountId);
    expect(audit.occurredAt).toEqual(first90DaysNow);
    const after = await list(staff('coordinator'));
    expect(after.items.some((item) => item.clientId === client.clientId)).toBe(
      false,
    );
  });

  it.each([['assistant'], ['trainer'], ['nutritionist']] as const)(
    'gives 403 to a %s on the list and the mark',
    async (role) => {
      const denied = staff(role);
      await expect(list(denied)).rejects.toMatchObject({
        code: 'administration_access_denied',
        status: 403,
      });
      await expect(
        mark('00000000-0000-4000-8000-000000000001', denied),
      ).rejects.toMatchObject({
        code: 'administration_access_denied',
        status: 403,
      });
    },
  );
});

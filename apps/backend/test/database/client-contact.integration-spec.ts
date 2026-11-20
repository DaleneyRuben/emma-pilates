import { PrismaPg } from '@prisma/adapter-pg';
import { boliviaDate } from '../../src/time/bolivia-time';
import { readClientContact } from '../../src/booking/first-90-days/client-contact';
import { createFirst90DaysJob } from '../../src/booking/first-90-days/prisma-first-90-days';
import { createPrismaContactAlerts } from '../../src/booking/first-90-days/prisma-contact-alerts';
import { PrismaClient } from '../../src/generated/prisma/client';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  createClientWithPlan,
  first90DaysNow,
} from './first-90-days-test-support';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

// Staff pick E4 A: the ficha reads one Client's Contact Alerts.
describe('One Client contact state (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const read = (clientId: string) => {
    const store = createPrismaContactAlerts(prisma);
    return readClientContact(clientId, {
      now: () => first90DaysNow,
      today: boliviaDate,
      findOpen: store.findOpen,
      findLastContact: store.findLastContact,
    });
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('reads her open alert, then her last contact once someone marks it', async () => {
    const valeria = await createClientWithPlan(prisma, {
      name: 'Valeria Quiroga',
      startsOn,
    });
    const other = await createClientWithPlan(prisma, {
      name: 'Rocío Paz',
      startsOn,
    });
    await createFirst90DaysJob(
      prisma,
      () => first90DaysNow,
      recordNotification,
    ).execute();

    await expect(read(valeria.clientId)).resolves.toEqual({
      onContactList: true,
      lastContactedAt: null,
      lastContactedByAccountId: null,
    });

    const actor = await prisma.staffMember.create({
      data: {
        name: 'Carolina Rivas',
        role: 'COORDINATOR',
        account: { create: { email: 'carolina.contact@example.test' } },
      },
      include: { account: true },
    });
    await createPrismaContactAlerts(prisma).mark({
      clientId: valeria.clientId,
      accountId: actor.account!.id,
      audit: {
        accountId: actor.account!.id,
        role: 'COORDINATOR',
        impersonationId: null,
      },
      occurredAt: first90DaysNow,
    });

    await expect(read(valeria.clientId)).resolves.toEqual({
      onContactList: false,
      lastContactedAt: first90DaysNow,
      lastContactedByAccountId: actor.account!.id,
    });
    // Another Client's alerts never leak into hers.
    await expect(read(other.clientId)).resolves.toMatchObject({
      onContactList: true,
      lastContactedAt: null,
    });
  });
});

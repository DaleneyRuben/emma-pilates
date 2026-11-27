import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import { createPrismaFeedbackStore } from '../../src/system-identity/feedback/prisma-feedback-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;
const sentAt = new Date('2026-11-26T15:00:00.000Z');

// Walkthrough n.º 11 (E-F25, E-F26, E-F19): the Staff app filters comments by
// type and opens one from its notification.
describe('Feedback for the Staff app (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaFeedbackStore(prisma, { recordNotification });
  const clientAccountId = randomUUID();

  const message = (type: 'problem' | 'suggestion' | 'other') => ({
    id: randomUUID(),
    accountId: clientAccountId,
    app: 'client' as const,
    role: 'client' as const,
    type,
    text: `Comentario de tipo ${type} desde la app.`,
    appVersion: '1.1.0',
    appBuild: '12',
    platform: 'ios' as const,
    osVersion: '26.2',
    idempotencyKey: randomUUID(),
    sentAt,
    windowStartsAt: new Date(sentAt.getTime() - day),
    dailyLimit: 10,
  });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await prisma.client.create({
      data: {
        name: 'Ana Pérez',
        referralCode: `REF-${clientAccountId}`,
        account: {
          create: { id: clientAccountId, email: 'ana@example.com' },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists only the comments of the chosen type', async () => {
    await store().send(message('problem'));
    await store().send(message('suggestion'));

    const page = await store().list({
      page: 1,
      pageSize: 20,
      type: 'problem',
    });

    expect(page.items.map((item) => item.type)).toEqual(['problem']);
    expect(page.totalItems).toBe(1);
  });

  it('reads one comment, and nothing for an unknown one', async () => {
    const sent = await store().send(message('other'));

    await expect(store().find(sent.id)).resolves.toMatchObject({
      id: sent.id,
      type: 'other',
      senderName: 'Ana Pérez',
      senderEmail: 'ana@example.com',
      status: 'new',
    });
    await expect(store().find(randomUUID())).resolves.toBeNull();
  });
});

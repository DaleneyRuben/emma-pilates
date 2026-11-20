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
const sentAt = new Date('2026-10-23T15:00:00.000Z');

// FIX-091 (W3 B): Comentarios counts each status, whatever the filters.
describe('Feedback counts per status (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaFeedbackStore(prisma, { recordNotification });
  const clientAccountId = randomUUID();
  const actor = {
    accountId: randomUUID(),
    staffMemberId: randomUUID(),
  };

  const message = () => ({
    id: randomUUID(),
    accountId: clientAccountId,
    app: 'client' as const,
    role: 'client' as const,
    type: 'problem' as const,
    text: 'No puedo ver mis reservas de mañana.',
    appVersion: '1.0.1',
    appBuild: '3',
    platform: 'android' as const,
    osVersion: '14',
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
        name: 'Valeria Quiroga',
        referralCode: `REF-${clientAccountId}`,
        account: {
          create: { id: clientAccountId, email: 'valeria@example.com' },
        },
      },
    });
    await prisma.staffMember.create({
      data: {
        id: actor.staffMemberId,
        name: 'Administradora Ana',
        role: 'ADMINISTRATOR',
        account: {
          create: {
            id: actor.accountId,
            email: 'ana@example.com',
            activatedAt: new Date('2026-10-01T12:00:00.000Z'),
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('counts new, reviewed and resolved Feedback across every page and filter', async () => {
    for (let index = 0; index < 4; index += 1) {
      await store().send(message());
    }
    await expect(store().list({ page: 1, pageSize: 1 })).resolves.toMatchObject(
      { newCount: 4, reviewedCount: 0, resolvedCount: 0 },
    );

    const [first, second, third] = (
      await store().list({ page: 1, pageSize: 3 })
    ).items;
    for (const [row, status] of [
      [first, 'reviewed'],
      [second, 'resolved'],
      [third, 'resolved'],
    ] as const) {
      await store().triage({
        feedbackId: row.id,
        status,
        changeNote: null,
        actor,
        occurredAt: sentAt,
      });
    }

    await expect(
      store().list({ page: 1, pageSize: 1, app: 'staff' }),
    ).resolves.toMatchObject({
      newCount: 1,
      reviewedCount: 1,
      resolvedCount: 2,
    });
  });
});

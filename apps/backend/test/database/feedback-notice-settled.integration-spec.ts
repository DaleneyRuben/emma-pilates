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

// Testing session (E-F20): once a comment is triaged, its «Nuevo comentario»
// notice stops asking on every Administrator's bell, as a decided receipt or
// Freeze does (walkthrough n.º 13).
describe('a triaged comment and its notices (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaFeedbackStore(prisma, { recordNotification });
  const clientAccountId = randomUUID();
  const administrators = [randomUUID(), randomUUID()];
  const staffMemberId = randomUUID();

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
    for (const [index, accountId] of administrators.entries()) {
      await prisma.staffMember.create({
        data: {
          ...(index === 0 ? { id: staffMemberId } : {}),
          name: `Administradora ${index + 1}`,
          role: 'ADMINISTRATOR',
          account: {
            create: {
              id: accountId,
              email: `${accountId}@example.com`,
              activatedAt: new Date('2026-10-01T12:00:00.000Z'),
            },
          },
        },
      });
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const send = async () => {
    const id = randomUUID();
    await store().send({
      id,
      accountId: clientAccountId,
      app: 'client',
      role: 'client',
      type: 'problem',
      text: 'No puedo ver mis reservas de mañana.',
      appVersion: '1.0.1',
      appBuild: '3',
      platform: 'android',
      osVersion: '14',
      idempotencyKey: randomUUID(),
      sentAt,
      windowStartsAt: new Date(sentAt.getTime() - day),
      dailyLimit: 10,
    });
    return id;
  };

  const readAtOf = (feedbackId: string) =>
    prisma.notification.findMany({
      where: { businessEventKey: `feedback-received:${feedbackId}` },
      select: { readAt: true },
    });

  it('marks every unread copy read when the comment is triaged', async () => {
    const feedbackId = await send();
    const occurredAt = new Date(sentAt.getTime() + 60_000);

    await store().triage({
      feedbackId,
      status: 'reviewed',
      changeNote: null,
      actor: { accountId: administrators[0]!, staffMemberId },
      occurredAt,
    });

    await expect(readAtOf(feedbackId)).resolves.toEqual([
      { readAt: occurredAt },
      { readAt: occurredAt },
    ]);
  });

  it('leaves them unread when it goes back to «Nuevo»', async () => {
    const feedbackId = await send();

    await store().triage({
      feedbackId,
      status: 'new',
      changeNote: null,
      actor: { accountId: administrators[0]!, staffMemberId },
      occurredAt: new Date(sentAt.getTime() + 60_000),
    });

    await expect(readAtOf(feedbackId)).resolves.toEqual([
      { readAt: null },
      { readAt: null },
    ]);
  });
});

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import { FeedbackError } from '../../src/system-identity/feedback/feedback';
import { createPrismaFeedbackStore } from '../../src/system-identity/feedback/prisma-feedback-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;
const sentAt = new Date('2026-10-23T15:00:00.000Z');

describe('Feedback (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaFeedbackStore(prisma, { recordNotification });
  const ids = {
    client: randomUUID(),
    trainer: randomUUID(),
    administrator: randomUUID(),
    administratorStaff: randomUUID(),
    disabledAdministrator: randomUUID(),
  };
  const actor = {
    accountId: ids.administrator,
    staffMemberId: ids.administratorStaff,
  };

  const message = (overrides: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    accountId: ids.client,
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
    ...overrides,
  });

  const administrator = (accountId: string, disabledAt: Date | null) =>
    prisma.staffMember.create({
      data: {
        name: `Administradora ${accountId.slice(0, 4)}`,
        role: 'ADMINISTRATOR',
        ...(accountId === ids.administrator
          ? { id: ids.administratorStaff }
          : {}),
        account: {
          create: {
            id: accountId,
            email: `${accountId}@example.com`,
            activatedAt: new Date('2026-10-01T12:00:00.000Z'),
            disabledAt,
          },
        },
      },
    });

  const clientAccount = (accountId: string, email: string) =>
    prisma.client.create({
      data: {
        name: 'Valeria Quiroga',
        referralCode: `REF-${accountId}`,
        account: { create: { id: accountId, email } },
      },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await clientAccount(ids.client, 'valeria@example.com');
    await prisma.staffMember.create({
      data: {
        name: 'Camila Rojas',
        role: 'TRAINER',
        account: { create: { id: ids.trainer, email: 'camila@example.com' } },
      },
    });
    await administrator(ids.administrator, null);
    await administrator(
      ids.disabledAdministrator,
      new Date('2026-10-10T12:00:00.000Z'),
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('stores the Feedback with its metadata and notifies each active Administrator once', async () => {
    const input = message();

    await expect(store().send(input)).resolves.toEqual({
      id: input.id,
      createdAt: sentAt,
    });
    await expect(
      prisma.feedback.findUniqueOrThrow({ where: { id: input.id } }),
    ).resolves.toMatchObject({
      accountId: ids.client,
      app: 'CLIENT',
      senderRole: 'client',
      type: 'PROBLEM',
      text: input.text,
      appVersion: '1.0.1',
      appBuild: '3',
      platform: 'ANDROID',
      osVersion: '14',
      status: 'NEW',
      changeNote: null,
      triagedAt: null,
      createdAt: sentAt,
    });
    await expect(
      prisma.notification.findMany({
        where: { businessEventKey: `feedback-received:${input.id}` },
        select: {
          accountId: true,
          type: true,
          title: true,
          message: true,
          destinationType: true,
          destinationId: true,
        },
      }),
    ).resolves.toEqual([
      {
        accountId: ids.administrator,
        type: 'feedback_received',
        title: 'Comentario nuevo',
        message:
          'Llegó un problema desde la app de clientas. Revísalo en la web de administración.',
        destinationType: 'feedback',
        destinationId: input.id,
      },
    ]);
  });

  it('never notifies the Administrator who sent it', async () => {
    const input = message({
      accountId: ids.administrator,
      app: 'staff',
      role: 'administrator',
      type: 'suggestion',
    });

    await store().send(input);
    await expect(
      prisma.notification.count({
        where: { businessEventKey: `feedback-received:${input.id}` },
      }),
    ).resolves.toBe(0);
  });

  it('replays a repeated Idempotency-Key and refuses it with other input', async () => {
    const input = message({ accountId: ids.trainer, app: 'staff' });
    const staffInput = { ...input, role: 'trainer' as const };

    const first = await store().send(staffInput);
    await expect(
      store().send({ ...staffInput, id: randomUUID() }),
    ).resolves.toEqual(first);
    await expect(
      prisma.feedback.count({ where: { accountId: ids.trainer } }),
    ).resolves.toBe(1);
    await expect(
      store().send({
        ...staffInput,
        id: randomUUID(),
        text: 'Otro texto aquí.',
      }),
    ).rejects.toEqual(new FeedbackError('idempotency_key_reused'));
  });

  it('refuses the eleventh in 24 hours and forgets older ones', async () => {
    const accountId = randomUUID();
    await clientAccount(accountId, `${accountId}@example.com`);
    await prisma.feedback.create({
      data: {
        id: randomUUID(),
        accountId,
        app: 'CLIENT',
        senderRole: 'client',
        type: 'OTHER',
        text: 'Un comentario de anteayer.',
        appVersion: '1.0.0',
        appBuild: '1',
        platform: 'IOS',
        osVersion: '18.0',
        createdAt: new Date(sentAt.getTime() - day - 1),
      },
    });
    for (let index = 0; index < 10; index += 1) {
      await store().send(message({ accountId }));
    }

    await expect(store().send(message({ accountId }))).rejects.toEqual(
      new FeedbackError('feedback_limit_reached'),
    );
    await expect(prisma.feedback.count({ where: { accountId } })).resolves.toBe(
      11,
    );
  });

  it('pages newest first with the status and app filters and the new count', async () => {
    const removed = message({ text: 'Un comentario eliminado.' });
    await store().send(removed);
    await prisma.feedback.update({
      where: { id: removed.id },
      data: { deletedAt: sentAt },
    });

    const page = await store().list({ page: 1, pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.totalItems).toBe(14);
    expect(page.newCount).toBe(14);
    const clientPage = await store().list({
      page: 1,
      pageSize: 1,
      app: 'client',
    });
    expect(clientPage.items[0]).toEqual({
      id: expect.any(String) as string,
      app: 'client',
      role: 'client',
      type: 'problem',
      text: 'No puedo ver mis reservas de mañana.',
      appVersion: '1.0.1',
      appBuild: '3',
      platform: 'android',
      osVersion: '14',
      status: 'new',
      changeNote: null,
      senderEmail: expect.any(String) as string,
      createdAt: sentAt,
      triagedAt: null,
    });
    const staffPage = await store().list({
      page: 1,
      pageSize: 20,
      app: 'staff',
    });
    expect(staffPage.items.map((row) => row.role).sort()).toEqual([
      'administrator',
      'trainer',
    ]);
    await expect(
      store().list({ page: 1, pageSize: 20, status: 'resolved' }),
    ).resolves.toMatchObject({ items: [], totalItems: 0, newCount: 14 });
  });

  it('triages a Feedback with its note and audits it', async () => {
    const input = message();
    await store().send(input);
    const occurredAt = new Date(sentAt.getTime() + 60_000);

    await expect(
      store().triage({
        feedbackId: input.id,
        status: 'resolved',
        changeNote: 'Arreglamos la lista de reservas en la 1.0.2.',
        actor,
        occurredAt,
      }),
    ).resolves.toMatchObject({
      id: input.id,
      status: 'resolved',
      changeNote: 'Arreglamos la lista de reservas en la 1.0.2.',
      senderEmail: 'valeria@example.com',
      triagedAt: occurredAt,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'feedback.triaged', targetId: input.id },
        select: {
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          metadata: true,
          occurredAt: true,
        },
      }),
    ).resolves.toEqual({
      actorAccountId: ids.administrator,
      actorRole: 'ADMINISTRATOR',
      targetType: 'feedback',
      metadata: {
        previousStatus: 'new',
        status: 'resolved',
        noteChanged: true,
      },
      occurredAt,
    });
    await expect(
      store().triage({
        feedbackId: randomUUID(),
        status: 'reviewed',
        changeNote: null,
        actor,
        occurredAt,
      }),
    ).resolves.toBeNull();
  });

  it('exports every live Feedback newest first and audits the export', async () => {
    const all = await store().listAll();
    expect(all.length).toBe(15);
    expect(
      all.every(
        (row, index) =>
          index === 0 || row.createdAt <= all[index - 1].createdAt,
      ),
    ).toBe(true);
    await store().recordExport({
      actor,
      feedbackCount: 15,
      occurredAt: sentAt,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'feedback.exported' },
        select: { targetType: true, targetId: true, metadata: true },
      }),
    ).resolves.toEqual({
      targetType: 'feedback',
      targetId: null,
      metadata: { feedbackCount: 15 },
    });
  });
});

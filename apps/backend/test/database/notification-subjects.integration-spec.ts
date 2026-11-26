import { randomUUID } from 'node:crypto';
import { readNotificationSubjects } from '../../src/notifications/prisma-notification-subjects';
import {
  hour,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

// Walkthrough n.º 12 (E-F07) and n.º 11 (E-F20): an Administrator's review
// notices say whose receipt or Freeze it is, for how much, and how it was
// decided; a feedback notice says who wrote and how the text begins.
describe('what a review or feedback notice is about', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const submittedTransfer = async (name: string) => {
    const buyer = await world.newClient(name);
    const intent = await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, buyer, randomUUID());
    const receipt = await world.readyReceipt(buyer.accountId);
    await world
      .commands()
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );
    return world
      .commands()
      .submitTransfer({ purchaseIntentId: intent.id }, buyer, randomUUID());
  };

  const notice = (type: string, destinationType: string, id: string) => ({
    id: randomUUID(),
    type,
    destinationType,
    destinationId: id,
  });

  it('describes a receipt waiting for review and one approved by an Administrator', async () => {
    const waiting = await submittedTransfer('Ana Espera');
    const approved = await submittedTransfer('Sofía Aprobada');
    const decidedAt = new Date(now.getTime() + hour);
    await world
      .commands(decidedAt)
      .confirmTransfer(
        { paymentId: approved.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );
    const pendingNotice = notice('payment_submitted', 'payment', waiting.id);
    const approvedNotice = notice('payment_submitted', 'payment', approved.id);

    const subjects = await readNotificationSubjects(world.prisma, [
      pendingNotice,
      approvedNotice,
      notice('payment_confirmed', 'subscription', randomUUID()),
    ]);

    expect(subjects.get(pendingNotice.id)).toEqual({
      review: {
        subject: 'payment',
        clientName: expect.stringContaining('Ana Espera'),
        planName: 'Paquete de 8 clases',
        amountCentavos: waiting.amountDueCentavos,
        startsOn: null,
        endsOn: null,
        outcome: 'pending',
        decidedByName: null,
        decidedAt: null,
      },
      feedback: null,
    });
    expect(subjects.get(approvedNotice.id)?.review).toMatchObject({
      outcome: 'approved',
      decidedByName: 'Paola Mendoza',
      decidedAt,
    });
    expect(subjects.size).toBe(2);
  });

  it('describes a refused Freeze', async () => {
    const client = await world.prisma.client.findFirstOrThrow({
      where: { subscriptions: { some: {} } },
      select: {
        id: true,
        name: true,
        subscriptions: {
          select: { id: true, planNameSnapshot: true },
          take: 1,
        },
      },
    });
    const paola = await world.prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com' },
      select: { id: true },
    });
    const freeze = await world.prisma.freeze.create({
      data: {
        subscriptionId: client.subscriptions[0]!.id,
        clientId: client.id,
        startsOn: new Date('2026-11-23T00:00:00.000Z'),
        endsOn: new Date('2026-11-29T00:00:00.000Z'),
        reason: 'Viaje',
        state: 'REFUSED',
        refusalReason: 'Fuera de plazo',
        decidedByAccountId: paola.id,
        decidedAt: now,
      },
      select: { id: true },
    });
    const freezeNotice = notice('freeze_requested', 'freeze', freeze.id);

    const subjects = await readNotificationSubjects(world.prisma, [
      freezeNotice,
    ]);

    expect(subjects.get(freezeNotice.id)?.review).toEqual({
      subject: 'freeze',
      clientName: client.name,
      planName: client.subscriptions[0]!.planNameSnapshot,
      amountCentavos: null,
      startsOn: '2026-11-23',
      endsOn: '2026-11-29',
      outcome: 'rejected',
      decidedByName: 'Paola Mendoza',
      decidedAt: now,
    });
  });

  it('describes a feedback by its author and the start of its text', async () => {
    const lucia = await world.prisma.account.findFirstOrThrow({
      where: { email: 'lucia@example.com' },
      select: { id: true, client: { select: { name: true } } },
    });
    const feedback = await world.prisma.feedback.create({
      data: {
        id: randomUUID(),
        accountId: lucia.id,
        app: 'CLIENT',
        senderRole: 'client',
        type: 'PROBLEM',
        text: 'No encuentro dónde ver mi lista de espera desde Inicio. Tengo que entrar a Mis reservas cada vez.',
        appVersion: '1.1.0',
        appBuild: '12',
        platform: 'IOS',
        osVersion: '26.2',
        createdAt: now,
      },
      select: { id: true },
    });
    const feedbackNotice = notice('feedback_received', 'feedback', feedback.id);

    const subjects = await readNotificationSubjects(world.prisma, [
      feedbackNotice,
    ]);

    expect(subjects.get(feedbackNotice.id)).toEqual({
      review: null,
      feedback: {
        feedbackId: feedback.id,
        authorName: lucia.client!.name,
        type: 'problem',
        app: 'client',
        excerpt: 'No encuentro dónde ver mi lista de espera desde Inicio…',
      },
    });
  });
});

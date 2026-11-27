import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

// FIX-019 (3), owner 2026-10-30: a Guest Pass never covers an Evaluation.
// Owner 2026-11-27: Courtesy Access does, always as a Paid Evaluation at the
// studio price, even when its range is quarterly.
describe('evaluations and courtesy plans', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
  });

  afterAll(async () => {
    await world?.stop();
  });

  const slot = (startsAt: string) =>
    slotIdAt(world.prisma, mondayBlockId, startsAt);

  const newClient = async (name: string) => {
    const email = `${randomUUID()}@example.com`;
    const client = await world.prisma.client.create({
      data: { name, referralCode: randomUUID() },
    });
    await world.prisma.account.create({
      data: { email, clientId: client.id },
    });
    return { clientId: client.id, principal: await world.principalOf(email) };
  };

  it('refuses a paid Evaluation to a friend holding only a Guest Pass', async () => {
    const host = await world.principalOf('lucia@example.com');
    const friend = await newClient('Invitada');
    const author = await world.principalOf('paola.mendoza@example.com');
    await world.prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId:
          host.identity.kind === 'client' ? host.identity.clientId : '',
        friendClientId: friend.clientId,
        authorAccountId: author.accountId,
        now: fixtureNow,
      }),
    );

    await expect(
      codeOf(
        commands().bookEvaluation(
          await slot('2026-09-28T13:00:00.000Z'),
          friend.principal,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('no_eligible_subscription');
    await expect(
      commands().listBookableSlots({}, friend.principal),
    ).resolves.toMatchObject({ planCoversEvaluation: false });
  });

  const courtesyClient = async (name: string) => {
    const guest = await newClient(name);
    await createPrismaCourtesyAccess(world.prisma, {
      now: () => fixtureNow,
    }).grant(
      {
        clientId: guest.clientId,
        endsOn: new Date('2026-12-20T00:00:00.000Z'),
      },
      await world.principalOf('paola.mendoza@example.com'),
      randomUUID(),
    );
    // A quarterly range would include an Evaluation on a paid Plan.
    await world.prisma.subscription.updateMany({
      where: { clientId: guest.clientId },
      data: { durationDaysSnapshot: 90 },
    });
    return guest;
  };

  const studioPrice = async () =>
    (
      await world.prisma.studioSettingsVersion.findFirstOrThrow({
        orderBy: { version: 'desc' },
        select: { evaluationPriceCentavos: true },
      })
    ).evaluationPriceCentavos;

  it('offers Courtesy Access a paid Evaluation, never the included one', async () => {
    const guest = await courtesyClient('Cortesía');
    const price = await studioPrice();

    const availability = await commands().listBookableSlots(
      {},
      guest.principal,
    );
    expect(availability).toMatchObject({
      planCoversEvaluation: true,
      includedEvaluation: 'none',
      priceCentavos: price,
    });
    const offered = availability.days.flatMap((day) => day.slots);
    expect(offered.length).toBeGreaterThan(0);
    expect(
      offered.every((slot) => !slot.included && slot.priceCentavos === price),
    ).toBe(true);

    const slotId = await slot('2026-09-28T15:15:00.000Z');
    await expect(
      commands().readEvaluationSlot(slotId, guest.principal),
    ).resolves.toMatchObject({
      bookable: true,
      included: false,
      priceCentavos: price,
    });
    await expect(
      codeOf(commands().bookEvaluation(slotId, guest.principal, randomUUID())),
    ).resolves.toBe('evaluation_payment_required');

    const booked = await commands().bookPaidEvaluation(
      slotId,
      guest.principal,
      randomUUID(),
    );
    expect(booked).toMatchObject({
      included: false,
      priceCentavos: price,
      paymentState: 'pending',
    });
  });

  it('tells a Client with no Plan that no Plan covers an Evaluation', async () => {
    await expect(
      commands().listBookableSlots(
        {},
        await world.principalOf('mariana@example.com'),
      ),
    ).resolves.toMatchObject({ planCoversEvaluation: false });
    await expect(
      commands().listBookableSlots({}, (await newClient('Sin plan')).principal),
    ).resolves.toMatchObject({ planCoversEvaluation: false });
  });

  it('keeps the included Evaluation of a paid quarterly Plan', async () => {
    const ana = await world.principalOf('ana@example.com');
    await expect(commands().listBookableSlots({}, ana)).resolves.toMatchObject({
      planCoversEvaluation: true,
      includedEvaluation: 'available',
    });
    await expect(
      commands().bookEvaluation(
        await slot('2026-10-05T13:00:00.000Z'),
        ana,
        randomUUID(),
      ),
    ).resolves.toMatchObject({ included: true, priceCentavos: 0 });
  });
});

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

// FIX-019 (3), owner 2026-10-30: a paid Evaluation needs a paid Plan. A
// Guest Pass or Courtesy Access never covers one.
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
  });

  it('refuses a paid Evaluation to a Client holding only Courtesy Access', async () => {
    const guest = await newClient('Cortesía');
    await createPrismaCourtesyAccess(world.prisma, {
      now: () => fixtureNow,
    }).grant(
      {
        clientId: guest.clientId,
        endsOn: new Date('2026-10-20T00:00:00.000Z'),
      },
      await world.principalOf('paola.mendoza@example.com'),
      randomUUID(),
    );

    await expect(
      codeOf(
        commands().bookEvaluation(
          await slot('2026-09-28T15:15:00.000Z'),
          guest.principal,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('no_eligible_subscription');
  });
});

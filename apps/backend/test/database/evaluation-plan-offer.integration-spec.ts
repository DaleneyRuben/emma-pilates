import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// Walkthrough finding 69 (FIX-056): the Evaluación nutricional header says
// what today's Plan gives. Only a Plan of 90 days or longer includes one
// Evaluation (NUT-003); every other one costs the studio price.
describe('the evaluation offer of the Client’s current Plan', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  let price: number;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow });
  const offerOf = async (email: string) => {
    const availability = await commands().listBookableSlots(
      {},
      await world.principalOf(email),
    );
    return {
      includedEvaluation: availability.includedEvaluation,
      priceCentavos: availability.priceCentavos,
    };
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
    price = (
      await world.prisma.studioSettingsVersion.findFirstOrThrow({
        orderBy: { version: 'desc' },
        select: { evaluationPriceCentavos: true },
      })
    ).evaluationPriceCentavos;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('says a 30-day Plan pays the studio price', async () => {
    await expect(offerOf('lucia@example.com')).resolves.toEqual({
      includedEvaluation: 'none',
      priceCentavos: price,
    });
  });

  it('says a 90-day Plan includes its first Evaluation, then charges', async () => {
    await expect(offerOf('ana@example.com')).resolves.toEqual({
      includedEvaluation: 'available',
      priceCentavos: price,
    });

    await commands().bookEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, '2026-09-28T13:00:00.000Z'),
      await world.principalOf('ana@example.com'),
      randomUUID(),
    );

    await expect(offerOf('ana@example.com')).resolves.toEqual({
      includedEvaluation: 'used',
      priceCentavos: price,
    });
  });
});

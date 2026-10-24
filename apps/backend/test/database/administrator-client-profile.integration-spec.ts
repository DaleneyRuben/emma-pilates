import {
  readAdministratorClient,
  updateAdministratorClientProfile,
} from '../../src/booking/clients/administrator-clients';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const lucia = deterministicId('client:lucia');

// IDN-009: AW22 «Editar perfil» writes the Client row and one audit record
// naming the changed fields, never their values (ADR-0055).
describe('Client profile corrections on PostgreSQL', () => {
  let world: EvaluationTestWorld;
  const dependencies = () => ({
    directory: createPrismaAdministratorClients(world.prisma),
    now: () => fixtureNow,
  });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('saves the Coordinator’s correction and audits it with her Role', async () => {
    const coordinator = await world.principalOf('carolina.rivas@example.com');

    await expect(
      updateAdministratorClientProfile(
        { clientId: lucia, name: ' Lucía Fernández Paz ', phone: '' },
        coordinator,
        dependencies(),
      ),
    ).resolves.toMatchObject({ name: 'Lucía Fernández Paz', phone: null });

    await expect(
      world.prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'client.profile_corrected', targetId: lucia },
        select: { actorRole: true, metadata: true, targetType: true },
      }),
    ).resolves.toEqual({
      actorRole: 'COORDINATOR',
      targetType: 'client',
      metadata: { changedFields: ['name', 'phone'] },
    });
    const detail = await readAdministratorClient(
      { clientId: lucia },
      coordinator,
      dependencies(),
    );
    expect(detail.name).toBe('Lucía Fernández Paz');
    expect(detail).not.toHaveProperty('creditAvailableCentavos');
  });
});

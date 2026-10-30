import { createPrismaScheduleAdministration } from '../../src/booking/administration/prisma-schedule-administration';
import { updateAdministratorClientProfile } from '../../src/booking/clients/administrator-clients';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';
import { impersonating, openImpersonation } from './impersonation-test-support';

const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);
const bolivia = (date: string, time: string) =>
  new Date(`${date}T${time}:00.000-04:00`);
const urubo = deterministicId('branch:urubo');
const mat = deterministicId('class-type:mat');
const daniela = deterministicId('staff-member:daniela');
const emma = deterministicId('staff-member:emma');

// FIX-010 / ADR-0100: an audit record names who acted with her Role, the
// Administrator while she sees the app as the Coordinator; unaudited actor
// columns keep the Coordinator's Account.
describe('the audit actor of the Coordinator’s operations', () => {
  let world: EvaluationTestWorld;
  let carolina: AuthenticatedPrincipal;
  let paola: AuthenticatedPrincipal;
  let asCarolina: AuthenticatedPrincipal;
  let impersonationId: string;
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, { now: () => fixtureNow });
  const actorOf = (actionCode: string, targetId: string) =>
    world.prisma.auditRecord.findFirstOrThrow({
      where: { actionCode, targetId },
      orderBy: { occurredAt: 'desc' },
      select: { actorAccountId: true, actorRole: true, impersonationId: true },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    carolina = await world.principalOf('carolina.rivas@example.com');
    paola = await world.principalOf('paola.mendoza@example.com');
    const impersonation = await openImpersonation(world.prisma, {
      administratorAccountId: paola.accountId,
      staffMemberId: (carolina.identity as { staffMemberId: string })
        .staffMemberId,
      now: fixtureNow,
    });
    impersonationId = impersonation.id;
    asCarolina = impersonating(carolina, impersonation);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const createAndMoveSession = async (
    principal: AuthenticatedPrincipal,
    date: string,
  ) => {
    const session = await schedules().createSession(
      {
        branchId: urubo,
        classTypeId: mat,
        trainerStaffMemberId: daniela,
        startsAt: bolivia(date, '15:00'),
        durationMinutes: 50,
        capacity: 8,
      },
      principal,
    );
    await schedules().updateSession(
      { sessionId: session.id, trainerStaffMemberId: emma },
      principal,
    );
    return session.id;
  };

  it('audits her own Session exception with her Account and Role', async () => {
    const sessionId = await createAndMoveSession(carolina, '2026-09-28');

    await expect(actorOf('session.updated', sessionId)).resolves.toEqual({
      actorAccountId: carolina.accountId,
      actorRole: 'COORDINATOR',
      impersonationId: null,
    });
  });

  it('audits a Session and its exception as the Administrator’s while she is impersonated', async () => {
    const sessionId = await createAndMoveSession(asCarolina, '2026-09-29');
    const administrator = {
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId,
    };

    await expect(actorOf('session.created', sessionId)).resolves.toEqual(
      administrator,
    );
    await expect(actorOf('session.updated', sessionId)).resolves.toEqual(
      administrator,
    );
  });

  it('keeps her Account on the Sessions an impersonated schedule end cancels', async () => {
    const { schedule } = await schedules().createSchedule(
      {
        branchId: urubo,
        classTypeId: mat,
        trainerStaffMemberId: daniela,
        weekday: 3,
        startsAtLocal: '06:00',
        durationMinutes: 50,
        capacity: 8,
        effectiveFrom: civil('2026-09-22'),
      },
      carolina,
    );

    const ended = await schedules().endSchedule(
      { sessionScheduleId: schedule.id, effectiveFrom: civil('2026-09-23') },
      asCarolina,
    );

    expect(ended.cancelledSessions).toBeGreaterThan(0);
    const cancelledBy = await world.prisma.session.findMany({
      where: { sessionScheduleId: schedule.id, state: 'CANCELLED' },
      select: { cancelledByAccountId: true },
    });
    expect(new Set(cancelledBy.map((s) => s.cancelledByAccountId))).toEqual(
      new Set([carolina.accountId]),
    );
  });

  it('audits a Client profile correction as the Administrator’s while she is impersonated', async () => {
    const lucia = deterministicId('client:lucia');

    await updateAdministratorClientProfile(
      { clientId: lucia, name: 'Lucía Fernández', phone: '+591 70011002' },
      asCarolina,
      {
        directory: createPrismaAdministratorClients(world.prisma),
        now: () => fixtureNow,
      },
    );

    await expect(actorOf('client.profile_corrected', lucia)).resolves.toEqual({
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId,
    });
  });
});

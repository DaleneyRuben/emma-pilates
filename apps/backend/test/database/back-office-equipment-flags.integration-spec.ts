import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaEquipment } from '../../src/back-office/equipment/prisma-equipment';
import { createPrismaSessionEquipment } from '../../src/back-office/equipment/prisma-session-equipment';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

const hour = 60 * 60 * 1_000;

describe('Equipment faults reported from a Session and the capacity flags', () => {
  let world: EvaluationTestWorld;
  const now = () => fixtureNow;
  const equipment = () => createPrismaEquipment(world.prisma, { now });
  const sessionEquipment = () =>
    createPrismaSessionEquipment(world.prisma, { now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const emma = () => world.principalOf('emma.vargas@example.com');
  const daniela = () => world.principalOf('daniela.ortiz@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  const urubo = branchIdOf('urubo');
  const sessions: Record<string, string> = {};
  const reformers: string[] = [];

  const createSession = async (
    key: string,
    classTypeName: string,
    trainerEmail: string,
    startsAt: string,
    capacity: number,
  ) => {
    const [classType, trainer] = await Promise.all([
      world.prisma.classType.findFirstOrThrow({
        where: { name: classTypeName },
      }),
      world.prisma.account.findFirstOrThrow({
        where: { email: trainerEmail },
      }),
    ]);
    const start = new Date(startsAt);
    const session = await world.prisma.session.create({
      data: {
        branchId: centro,
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.staffMemberId!,
        startsAt: start,
        endsAt: new Date(start.getTime() + hour),
        capacity,
      },
    });
    sessions[key] = session.id;
  };

  // The development fixtures' own Sessions end in October.
  const flagged = async (
    from = '2026-11-01T00:00:00.000Z',
    until = '2027-01-01T00:00:00.000Z',
  ) =>
    (
      await equipment().listFlaggedSessions(
        { branchId: centro, from: new Date(from), until: new Date(until) },
        await administrator(),
      )
    ).map((flag) => [
      Object.keys(sessions).find((key) => sessions[key] === flag.sessionId),
      flag.kind,
      flag.capacity,
      flag.workingCount,
    ]);

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    for (let number = 1; number <= 8; number += 1) {
      reformers.push(
        (
          await equipment().createEquipment(
            { branchId: centro, kind: 'reformer', number },
            await administrator(),
          )
        ).id,
      );
    }
    await equipment().createEquipment(
      { branchId: centro, kind: 'cadillac', number: 1 },
      await administrator(),
    );
    await equipment().createEquipment(
      { branchId: urubo, kind: 'reformer', number: 1 },
      await administrator(),
    );
    await createSession(
      'a',
      'Reformer Pilates',
      'emma.vargas@example.com',
      '2026-12-01T13:00:00.000Z',
      8,
    );
    await createSession(
      'b',
      'Reformer Pilates',
      'emma.vargas@example.com',
      '2026-12-02T13:00:00.000Z',
      7,
    );
    await createSession(
      'c',
      'Reformer Pilates',
      'emma.vargas@example.com',
      '2026-12-03T13:00:00.000Z',
      8,
    );
    await createSession(
      'past',
      'Reformer Pilates',
      'emma.vargas@example.com',
      '2026-09-21T13:00:00.000Z',
      9,
    );
    await createSession(
      'mat',
      'Mat Pilates',
      'emma.vargas@example.com',
      '2026-12-01T15:00:00.000Z',
      14,
    );
    await createSession(
      'prenatal',
      'Pilates Prenatal',
      'emma.vargas@example.com',
      '2026-12-04T13:00:00.000Z',
      8,
    );
    await createSession(
      'big',
      'Reformer Pilates',
      'daniela.ortiz@example.com',
      '2026-12-05T13:00:00.000Z',
      9,
    );
    await world.prisma.session.update({
      where: { id: sessions.c },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'ZERO_BOOKINGS',
        cancelledAt: fixtureNow,
      },
    });
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('flags only future Sessions with more places than working Equipment of a registered kind', async () => {
    await expect(flagged()).resolves.toEqual([['big', 'reformer', 9, 8]]);
    await expect(
      flagged('2026-09-21T00:00:00.000Z', '2026-09-21T15:00:00.000Z'),
    ).resolves.toEqual([]);
    await expect(
      codeOf(
        equipment().listFlaggedSessions(
          { branchId: centro, from: fixtureNow, until: fixtureNow },
          await assistant(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
  });

  it('shows the leading Trainer her Branch’s Equipment, the Session’s kind first', async () => {
    const listed = await sessionEquipment().listSessionEquipment(
      { sessionId: sessions.a },
      await emma(),
    );
    expect(listed.kind).toBe('reformer');
    expect(listed.items.map((item) => [item.kind, item.number])).toEqual([
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((number) => ['reformer', number]),
      ['cadillac', 1],
    ]);
    const mat = await sessionEquipment().listSessionEquipment(
      { sessionId: sessions.mat },
      await emma(),
    );
    expect(mat.kind).toBe('mat');
    expect(mat.items[0]).toMatchObject({ kind: 'reformer', number: 1 });

    for (const principal of [
      await daniela(),
      await administrator(),
      await assistant(),
    ]) {
      await expect(
        codeOf(
          sessionEquipment().listSessionEquipment(
            { sessionId: sessions.a },
            principal,
          ),
        ),
      ).resolves.toBe('back_office_access_denied');
    }
  });

  it('flags every future reformer Session at capacity 8 once one reformer is out of service', async () => {
    const report = async (
      equipmentId: string,
      outOfService: boolean,
      principal: Awaited<ReturnType<typeof emma>>,
      sessionId = sessions.a,
    ) =>
      sessionEquipment().reportSessionIssue(
        {
          sessionId,
          equipmentId,
          description: 'El resorte rojo se soltó.',
          outOfService,
        },
        principal,
      );

    const urubos = await equipment().listEquipment(
      { branchId: urubo },
      await administrator(),
    );
    await expect(
      codeOf(report(urubos.items[0].id, true, await emma())),
    ).resolves.toBe('equipment_not_found');
    await expect(
      codeOf(report(reformers[4], true, await daniela())),
    ).resolves.toBe('back_office_access_denied');

    await report(reformers[3], false, await emma());
    await expect(flagged()).resolves.toEqual([['big', 'reformer', 9, 8]]);

    const issue = await report(reformers[4], true, await emma());
    expect(issue).toMatchObject({
      equipmentKind: 'reformer',
      equipmentNumber: 5,
      outOfService: true,
      reportedByName: 'Emma Vargas',
    });
    await expect(flagged()).resolves.toEqual([
      ['a', 'reformer', 8, 7],
      ['big', 'reformer', 9, 7],
    ]);
    await expect(
      flagged('2026-12-02T00:00:00.000Z', '2026-12-10T00:00:00.000Z'),
    ).resolves.toEqual([['big', 'reformer', 9, 7]]);

    await equipment().resolveIssue(
      { issueId: issue.id },
      await administrator(),
    );
    await expect(flagged()).resolves.toEqual([['big', 'reformer', 9, 8]]);
  });
});

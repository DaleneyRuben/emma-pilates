import { StaffRole } from '../../src/generated/prisma/enums';
import { isStorableMobile } from '../../src/phone/contact-phone';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  administratorEmail,
  clients,
  eventsOf,
  fieldsOf,
  startStudioWorld,
  type StudioWorld,
} from './android-test-studio-test-support';

const courtesyAccessEndsOn = boliviaDate(new Date(Date.now() + 40 * 864e5))
  .toISOString()
  .slice(0, 10);
const params = { clients, courtesyAccessEndsOn };
const clock = (date: Date): string => date.toISOString().slice(11, 16);

describe('the Android closed-test studio script', () => {
  let world: StudioWorld;

  beforeAll(async () => {
    world = await startStudioWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('refuses to run without the activation email keys', async () => {
    await expect(world.run(params, { withKeys: false })).rejects.toThrow(
      'authentication_keys_missing',
    );
  });

  it('writes nothing on a dry run and says what it would do', async () => {
    const before = await world.counts();

    const logged = await world.run(params, { dryRun: true });

    expect(await world.counts()).toEqual(before);
    expect(fieldsOf(logged, 'android_test_administrator')).toMatchObject({
      action: 'bootstrap',
    });
    expect(
      logged.filter(
        (entry) =>
          entry.event === 'android_test_plan' &&
          entry.fields.action === 'create',
      ),
    ).toHaveLength(8);
    expect(fieldsOf(logged, 'android_test_schedule')).toMatchObject({
      create: 56,
      existing: 0,
    });
    expect(fieldsOf(logged, 'android_test_minimum_bookings')).toMatchObject({
      previous: 2,
      action: 'lower',
    });
    expect(fieldsOf(logged, 'android_test_studio_done')).toEqual({
      dryRun: true,
      emails: 8,
    });
  });

  it('sets up the studio, its people, and its week through the product', async () => {
    const at = new Date();
    const logged = await world.run(params, { at });
    const { prisma } = world;

    const administrator = await prisma.account.findFirstOrThrow({
      where: { email: administratorEmail },
      select: {
        activatedAt: true,
        passwordHash: true,
        staffMember: { select: { name: true, role: true } },
      },
    });
    expect(administrator).toEqual({
      activatedAt: null,
      passwordHash: null,
      staffMember: { name: 'Emma Pilates Studio', role: 'ADMINISTRATOR' },
    });
    expect(
      await prisma.auditRecord.count({
        where: { actionCode: 'administrator_bootstrap.created' },
      }),
    ).toBe(1);

    const branch = await prisma.branch.findFirstOrThrow({
      select: { id: true, name: true, address: true },
    });
    expect(branch).toMatchObject({
      name: 'Achumani',
      address: 'Avenida Manuel Victor Garcia Lanza Nro 80',
    });
    const classTypes = await prisma.classType.findMany({
      select: { name: true, defaultCapacity: true, description: true },
      orderBy: { name: 'asc' },
    });
    expect(classTypes.map((type) => [type.name, type.defaultCapacity])).toEqual(
      [
        ['Cadillac', 8],
        ['Mat Pilates', 8],
        ['Reformer', 8],
      ],
    );
    expect(classTypes.every((type) => type.description.length > 20)).toBe(true);

    const plans = await prisma.plan.findMany({
      where: { hiddenAt: null },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        classAllowance: true,
        durationDays: true,
        priceCentavos: true,
        weeklyClassCap: true,
      },
    });
    expect(
      plans.map((plan) => [
        plan.name,
        plan.classAllowance,
        plan.durationDays,
        plan.priceCentavos / 100,
        plan.weeklyClassCap,
      ]),
    ).toEqual([
      ['Clase suelta', 1, 30, 80, null],
      ['4 clases', 4, 30, 290, null],
      ['8 clases', 8, 30, 590, null],
      ['12 clases', 12, 30, 820, null],
      ['Bimestral 16 clases', 16, 60, 1120, 3],
      ['Bimestral 24 clases', 24, 60, 1560, 4],
      ['Trimestral 24 clases', 24, 90, 1590, 3],
      ['Trimestral 36 clases', 36, 90, 2190, 4],
    ]);

    const staff = await prisma.account.findMany({
      where: { email: { startsWith: 'emmapilatesstudio+' } },
      orderBy: { email: 'asc' },
      select: {
        email: true,
        activatedAt: true,
        staffMember: {
          select: {
            name: true,
            role: true,
            phone: true,
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    });
    expect(
      staff.map((account) => [
        account.email,
        account.staffMember!.role,
        account.staffMember!.branchAssignments.map((a) => a.branchId),
      ]),
    ).toEqual([
      ['emmapilatesstudio+asistente@gmail.com', 'ASSISTANT', [branch.id]],
      ['emmapilatesstudio+coordinadora@gmail.com', 'COORDINATOR', []],
      ['emmapilatesstudio+instructora1@gmail.com', 'TRAINER', [branch.id]],
      ['emmapilatesstudio+instructora2@gmail.com', 'TRAINER', [branch.id]],
      [
        'emmapilatesstudio+nutricionista@gmail.com',
        'NUTRITIONIST',
        [branch.id],
      ],
    ]);
    expect(staff.every((account) => account.activatedAt === null)).toBe(true);
    expect(staff[2].staffMember!.name).toBe('Instructora 1');
    expect(isStorableMobile(staff[2].staffMember!.phone!)).toBe(true);
    expect(
      await prisma.auditRecord.count({
        where: { actionCode: 'staff_member.created' },
      }),
    ).toBe(5);

    const blocks = await prisma.availabilityBlock.findMany({
      select: { weekday: true, startsAtLocal: true, endsAtLocal: true },
      orderBy: { weekday: 'asc' },
    });
    expect(
      blocks.map((block) => [
        block.weekday,
        clock(block.startsAtLocal),
        clock(block.endsAtLocal),
      ]),
    ).toEqual([1, 2, 3, 4, 5, 6].map((day) => [day, '10:00', '12:00']));
    expect(fieldsOf(logged, 'android_test_studio_rules')).toMatchObject({
      evaluationPriceCentavos: 7000,
      nutritionistFeeCentavos: 5000,
    });

    const schedules = await prisma.sessionSchedule.findMany({
      select: {
        branchId: true,
        weekday: true,
        startsAtLocal: true,
        durationMinutes: true,
        capacity: true,
        effectiveFrom: true,
        effectiveUntil: true,
        classTypeId: true,
        trainerStaffMemberId: true,
      },
    });
    expect(schedules).toHaveLength(56);
    for (const weekday of [1, 2, 3, 4, 5, 6, 7]) {
      expect(
        schedules
          .filter((schedule) => schedule.weekday === weekday)
          .map((schedule) => clock(schedule.startsAtLocal))
          .sort(),
      ).toEqual([
        '09:00',
        '10:00',
        '11:00',
        '16:00',
        '17:00',
        '18:00',
        '19:00',
        '20:00',
      ]);
    }
    expect(
      schedules.every(
        (schedule) =>
          schedule.branchId === branch.id &&
          schedule.durationMinutes === 60 &&
          schedule.capacity === 8 &&
          schedule.effectiveUntil === null &&
          schedule.effectiveFrom.getTime() === boliviaDate(at).getTime(),
      ),
    ).toBe(true);
    expect(new Set(schedules.map((s) => s.classTypeId)).size).toBe(3);
    expect(new Set(schedules.map((s) => s.trainerStaffMemberId)).size).toBe(2);
    expect(
      await prisma.session.count({ where: { startsAt: { gt: at } } }),
    ).toBeGreaterThan(40);

    const settings = await prisma.studioSettingsVersion.findFirstOrThrow({
      orderBy: { version: 'desc' },
      select: { minimumBookings: true },
    });
    expect(settings.minimumBookings).toBe(1);
    expect(fieldsOf(logged, 'android_test_minimum_bookings')).toMatchObject({
      previous: 2,
      current: 1,
      action: 'lower',
    });

    const invited = await prisma.account.findMany({
      where: { clientId: { not: null } },
      orderBy: { email: 'asc' },
      select: {
        email: true,
        activatedAt: true,
        client: {
          select: {
            name: true,
            phone: true,
            subscriptions: {
              select: { payment: { select: { method: true } } },
            },
          },
        },
      },
    });
    expect(
      invited.map((account) => [
        account.email,
        account.activatedAt,
        account.client!.name,
        account.client!.phone,
        account.client!.subscriptions.map((s) => s.payment?.method),
      ]),
    ).toEqual([
      [
        'ana.prueba@example.com',
        null,
        'Ana Prueba',
        '+591 71234567',
        ['COURTESY'],
      ],
      [
        'bea.prueba@example.com',
        null,
        'Bea Prueba',
        '+591 61234567',
        ['COURTESY'],
      ],
    ]);

    expect(await world.queuedEmails()).toBe(8);
    expect(fieldsOf(logged, 'android_test_studio_done')).toEqual({
      dryRun: false,
      emails: 8,
    });
    expect(JSON.stringify(logged)).not.toMatch(/token|password|secret/i);
  });

  it('skips everything that exists on a rerun and invites only new Clients', async () => {
    const before = await world.counts();
    const extra = {
      email: 'cami.prueba@example.com',
      name: 'Cami Prueba',
      phone: '72345678',
    };

    const logged = await world.run({
      ...params,
      clients: [...clients, extra],
    });

    const after = await world.counts();
    expect(after).toMatchObject({
      branches: before.branches,
      classTypes: before.classTypes,
      plans: before.plans,
      staffMembers: before.staffMembers,
      schedules: before.schedules,
      availabilityBlocks: before.availabilityBlocks,
      settingsVersions: before.settingsVersions,
      clients: before.clients + 1,
      payments: before.payments + 1,
      emails: before.emails + 1,
    });
    expect(fieldsOf(logged, 'android_test_administrator')).toMatchObject({
      action: 'exists',
    });
    expect(fieldsOf(logged, 'android_test_schedule')).toMatchObject({
      create: 0,
      existing: 56,
    });
    expect(fieldsOf(logged, 'android_test_minimum_bookings')).toMatchObject({
      previous: 1,
      action: 'keep',
    });
    expect(
      logged
        .filter((entry) => entry.event === 'android_test_client')
        .map((entry) => entry.fields.action),
    ).toEqual(['exists', 'exists', 'invite']);
    expect(eventsOf(logged)).toContain('android_test_studio_done');
    expect(fieldsOf(logged, 'android_test_studio_done')).toEqual({
      dryRun: false,
      emails: 1,
    });
  });

  it('never takes over a Staff Member as a Client', async () => {
    const before = await world.counts();

    await expect(
      world.run({
        clients: [
          {
            email: 'emmapilatesstudio+asistente@gmail.com',
            name: 'Otra',
            phone: '71234500',
          },
        ],
      }),
    ).rejects.toThrow('client_email_taken');
    expect(await world.counts()).toMatchObject({
      clients: before.clients,
      emails: before.emails,
    });
    expect(
      await world.prisma.staffMember.count({
        where: { role: StaffRole.ASSISTANT },
      }),
    ).toBe(1);
  });
});

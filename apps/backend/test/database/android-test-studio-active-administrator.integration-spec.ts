import { StaffRole } from '../../src/generated/prisma/enums';
import {
  administratorEmail,
  fieldsOf,
  startStudioWorld,
  type StudioWorld,
} from './android-test-studio-test-support';

// Production may already have an Administrator who activated (the owner's
// own Account). The bootstrap refuses then, so she invites the studio's
// address like any «Nuevo miembro», and every write is in her name.
describe('the Android closed-test studio script with an active Administrator', () => {
  let world: StudioWorld;
  let ownerAccountId: string;

  beforeAll(async () => {
    world = await startStudioWorld();
    const owner = await world.prisma.staffMember.create({
      data: {
        name: 'Dueña',
        role: StaffRole.ADMINISTRATOR,
        referralCode: 'DUENA1',
        account: {
          create: {
            email: 'duena@example.com',
            passwordHash: 'not-a-real-hash',
            emailVerifiedAt: new Date(),
            activatedAt: new Date(),
          },
        },
      },
      select: { account: { select: { id: true } } },
    });
    ownerAccountId = owner.account!.id;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('invites the studio address as a new Administrator and acts as the owner', async () => {
    const logged = await world.run({});

    expect(fieldsOf(logged, 'android_test_administrator')).toMatchObject({
      action: 'invite',
    });
    const studio = await world.prisma.account.findFirstOrThrow({
      where: { email: administratorEmail },
      select: {
        activatedAt: true,
        staffMember: { select: { role: true, name: true } },
      },
    });
    expect(studio).toEqual({
      activatedAt: null,
      staffMember: { role: 'ADMINISTRATOR', name: 'Emma Pilates Studio' },
    });
    expect(
      await world.prisma.auditRecord.count({
        where: { actionCode: { startsWith: 'administrator_bootstrap.' } },
      }),
    ).toBe(0);
    const audits = await world.prisma.auditRecord.findMany({
      where: { actionCode: { in: ['staff_member.created', 'branch.created'] } },
      select: { actorAccountId: true },
    });
    expect(audits).toHaveLength(7);
    expect(audits.every((a) => a.actorAccountId === ownerAccountId)).toBe(true);
    expect(await world.queuedEmails()).toBe(6);
  });
});

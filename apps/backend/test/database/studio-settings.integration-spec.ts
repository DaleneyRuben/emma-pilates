import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  createPrismaStudioSettings,
  readCurrentStudioSettings,
} from '../../src/booking/studio-settings/prisma-studio-settings';
import { StudioSettingsError } from '../../src/booking/studio-settings/studio-settings';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  startDatabaseTestContext,
  type DatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-10-23T15:00:00.000Z');

const seeded = {
  version: 1,
  cancellationWindowMinutes: 150,
  minimumBookings: 2,
  minimumBookingsCheckLeadMinutes: 180,
  startDateLimitDays: 14,
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
  guestPassesPerClient: 1,
  invitesPerHostPerMonth: 1,
  inviteRewardClasses: 1,
  taxRatePercent: 16,
  evaluationPriceCentavos: 7_000,
  nutritionistFeeCentavos: 5_000,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null,
};

const editable = {
  minimumBookings: 2,
  taxRatePercent: 16,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null,
};

describe('Studio Settings on PostgreSQL', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let administrator: AuthenticatedPrincipal;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    const staff = await prisma.staffMember.create({
      data: { name: 'Paola Rivero', role: 'ADMINISTRATOR' },
    });
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: staff.id,
      },
    });
    administrator = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: staff.id,
        role: 'administrator',
        branchIds: [],
      },
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const settings = () => createPrismaStudioSettings(prisma, { now: () => now });

  it('starts from the seeded version with today’s rules', async () => {
    await expect(readCurrentStudioSettings(prisma)).resolves.toEqual(seeded);
    await expect(settings().read(administrator)).resolves.toMatchObject({
      ...seeded,
      updatedByName: null,
    });
  });

  it('exposes the client-facing rules and the cheapest visible Plan', async () => {
    await prisma.plan.createMany({
      data: [
        {
          name: 'Clase suelta',
          durationMonths: 1,
          classAllowance: 1,
          priceCentavos: 8_000,
          displayOrder: 1,
        },
        {
          name: 'Pase de prueba',
          durationMonths: 1,
          classAllowance: 16,
          priceCentavos: 0,
          displayOrder: 2,
          hiddenAt: now,
        },
        {
          name: '8 clases',
          durationMonths: 1,
          classAllowance: 8,
          priceCentavos: 59_000,
          displayOrder: 3,
        },
      ],
    });

    await expect(settings().rules()).resolves.toEqual({
      cancellationWindowMinutes: 150,
      evaluationPriceCentavos: 7_000,
      plansFromPriceCentavos: 8_000,
      startDateLimitDays: 14,
      openingDate: null,
    });
  });

  it('appends a version and audits the old and new values', async () => {
    const saved = await settings().update(
      {
        expectedVersion: 1,
        values: { ...editable, minimumBookings: 3, openingDate: '2026-12-01' },
      },
      administrator,
    );

    expect(saved).toMatchObject({
      version: 2,
      minimumBookings: 3,
      openingDate: '2026-12-01',
      updatedAt: now,
      updatedByName: 'Paola Rivero',
    });
    await expect(prisma.studioSettingsVersion.count()).resolves.toBe(2);
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'studio_settings.updated' },
        select: {
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual({
      actorAccountId: administrator.accountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'studio_settings',
      metadata: {
        previousMinimumBookings: 2,
        minimumBookings: 3,
        previousOpeningDate: null,
        openingDate: '2026-12-01',
        version: 2,
      },
    });
    await expect(settings().rules()).resolves.toMatchObject({
      openingDate: '2026-12-01',
    });
  });

  it('refuses a form saved over a newer version', async () => {
    await expect(
      settings().update(
        { expectedVersion: 1, values: { ...editable, taxRatePercent: 13 } },
        administrator,
      ),
    ).rejects.toEqual(
      new StudioSettingsError('studio_settings_version_conflict'),
    );
  });

  it('never changes or removes a version', async () => {
    await expect(
      prisma.$executeRaw`update booking.studio_settings_versions set minimum_bookings = 5`,
    ).rejects.toThrow('append-only');
    await expect(
      prisma.$executeRaw`delete from booking.studio_settings_versions`,
    ).rejects.toThrow('append-only');
  });
});

import { readCurrentStudioSettings } from '../../../booking/studio-settings/prisma-studio-settings';
import { boliviaDate } from '../../../time/bolivia-time';
import { administratorEmail } from './studio-people';
import { actingAdministrator } from './studio-principals';
import type { StudioRun } from './studio-services';

export const branch = {
  name: 'Achumani',
  address: 'Avenida Manuel Victor Garcia Lanza Nro 80',
};

// Eight places in every class (owner, 2026-11-19). The equipment is a note
// for the instructors; no class type requires an equipment kind.
export const classTypes = [
  {
    name: 'Reformer',
    description:
      'Clase en reformer: fuerza, alineación y movilidad con la resistencia de los resortes.',
    equipmentNeeds: 'Reformer',
  },
  {
    name: 'Mat Pilates',
    description:
      'Clase en colchoneta con el peso del cuerpo y accesorios para trabajar el centro y la postura.',
    equipmentNeeds: 'Colchoneta',
  },
  {
    name: 'Cadillac',
    description:
      'Clase en cadillac con barras y resortes para estirar, fortalecer y moverse con más apoyo.',
    equipmentNeeds: 'Cadillac',
  },
].map((type) => ({ ...type, defaultCapacity: 8 }));

// docs/decisiones-emma-pilates.md §2.1, in its order.
export const plans = [
  ['Clase suelta', 1, 30, 80, null],
  ['4 clases', 4, 30, 290, null],
  ['8 clases', 8, 30, 590, null],
  ['12 clases', 12, 30, 820, null],
  ['Bimestral 16 clases', 16, 60, 1120, 3],
  ['Bimestral 24 clases', 24, 60, 1560, 4],
  ['Trimestral 24 clases', 24, 90, 1590, 3],
  ['Trimestral 36 clases', 36, 90, 2190, 4],
].map(([name, classAllowance, durationDays, bolivianos, cap], index) => ({
  name: name as string,
  classAllowance: classAllowance as number,
  durationDays: durationDays as number,
  priceCentavos: (bolivianos as number) * 100,
  weeklyClassCap: cap as number | null,
  displayOrder: index + 1,
}));

const sameName = (name: string) => ({
  name: { equals: name, mode: 'insensitive' as const },
});

/** The Branch's id, or null on a dry run before it exists. */
export const ensureBranch = async (run: StudioRun): Promise<string | null> => {
  const { prisma, dryRun, log } = run.context;
  const existing = await prisma.branch.findFirst({
    where: { ...sameName(branch.name), archivedAt: null },
    select: { id: true },
  });
  log('android_test_branch', {
    name: branch.name,
    action: existing === null ? 'create' : 'exists',
  });
  if (existing !== null) return existing.id;
  if (dryRun) return null;
  const created = await run.services.catalog.createBranch(
    branch,
    await actingAdministrator(prisma, administratorEmail),
  );
  return created.id;
};

/** The Class Types' ids in the order above (absent on a dry run). */
export const ensureClassTypes = async (run: StudioRun): Promise<string[]> => {
  const { prisma, dryRun, log } = run.context;
  const ids: string[] = [];
  for (const type of classTypes) {
    const existing = await prisma.classType.findFirst({
      where: { ...sameName(type.name), archivedAt: null },
      select: { id: true },
    });
    log('android_test_class_type', {
      name: type.name,
      action: existing === null ? 'create' : 'exists',
    });
    if (existing !== null) {
      ids.push(existing.id);
    } else if (!dryRun) {
      const created = await run.services.catalog.createClassType(
        type,
        await actingAdministrator(prisma, administratorEmail),
      );
      ids.push(created.id);
    }
  }
  return ids;
};

export const ensurePlans = async (run: StudioRun): Promise<void> => {
  const { prisma, dryRun, log } = run.context;
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({
      where: { ...sameName(plan.name), hiddenAt: null },
      select: { id: true },
    });
    log('android_test_plan', {
      name: plan.name,
      action: existing === null ? 'create' : 'exists',
    });
    if (existing === null && !dryRun) {
      await run.services.catalog.createPlan(
        plan,
        await actingAdministrator(prisma, administratorEmail),
      );
    }
  }
};

// §6, §8: the rates the migrations seeded. They are not edited here; the log
// says whether they still match the decisions.
const decidedRules = {
  evaluationPriceCentavos: 7000,
  nutritionistFeeCentavos: 5000,
  classCentavos: 6500,
  includedStudents: 4,
  extraStudentCentavos: 800,
  minimumNotMetCentavos: 2500,
  commissionPercent: 10,
};

export const reportStudioRules = async (run: StudioRun): Promise<void> => {
  const { prisma, log, now } = run.context;
  const settings = await readCurrentStudioSettings(prisma);
  const rates = await prisma.payRateRule.findFirst({
    where: { effectiveFrom: { lte: boliviaDate(now()) } },
    orderBy: { effectiveFrom: 'desc' },
    select: {
      classCentavos: true,
      includedStudents: true,
      extraStudentCentavos: true,
      minimumNotMetCentavos: true,
      commissionPercent: true,
    },
  });
  const current = {
    evaluationPriceCentavos: settings.evaluationPriceCentavos,
    nutritionistFeeCentavos: settings.nutritionistFeeCentavos,
    ...rates,
  };
  log('android_test_studio_rules', {
    ...current,
    matchesDecisions: Object.entries(decidedRules).every(
      ([key, value]) => current[key as keyof typeof current] === value,
    ),
  });
};

// The real rule is 2 (§3.2); the test runs with 1 so a lone tester's class
// is held. The log keeps the previous value for the restore.
export const lowerMinimumBookings = async (run: StudioRun): Promise<void> => {
  const { prisma, dryRun, log } = run.context;
  const settings = await readCurrentStudioSettings(prisma);
  const action = settings.minimumBookings === 1 ? 'keep' : 'lower';
  log('android_test_minimum_bookings', {
    previous: settings.minimumBookings,
    current: dryRun ? settings.minimumBookings : 1,
    action,
  });
  if (action === 'keep' || dryRun) return;
  await run.services.studioSettings.update(
    {
      expectedVersion: settings.version,
      values: {
        minimumBookings: 1,
        taxRatePercent: settings.taxRatePercent,
        renewalTargetMonths1To6Percent: settings.renewalTargetMonths1To6Percent,
        renewalTargetMonths7To12Percent:
          settings.renewalTargetMonths7To12Percent,
        renewalTargetFromMonth13Percent:
          settings.renewalTargetFromMonth13Percent,
        openingDate: settings.openingDate,
        bookingWindowDays: settings.bookingWindowDays,
      },
    },
    await actingAdministrator(prisma, administratorEmail),
  );
};

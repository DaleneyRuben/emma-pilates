import { randomUUID } from 'node:crypto';
import { StaffRole, type PrismaClient } from '../../../generated/prisma/client';
import { createStaffMember } from '../../../booking/staff/staff-management';
import { bootstrapFirstAdministrator } from '../../../system-identity/bootstrap/bootstrap-first-administrator';
import { boliviaDate } from '../../../time/bolivia-time';
import type { StudioStaff } from './params';
import {
  activeAdministrator,
  actingAdministrator,
  nutritionistPrincipal,
} from './studio-principals';
import type { StudioRun } from './studio-services';

export const administratorEmail = 'emmapilatesstudio@gmail.com';

const roleCodes = {
  trainer: StaffRole.TRAINER,
  nutritionist: StaffRole.NUTRITIONIST,
  assistant: StaffRole.ASSISTANT,
  administrator: StaffRole.ADMINISTRATOR,
  coordinator: StaffRole.COORDINATOR,
} as const;

// Mondays to Saturdays, 10:00 to 12:00 at the Branch.
const nutritionistWeekdays = [1, 2, 3, 4, 5, 6];
const nutritionistHours = { startsAtLocal: '10:00', endsAtLocal: '12:00' };

const liveAccount = (prisma: PrismaClient, email: string) =>
  prisma.account.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      clientId: true,
      staffMember: { select: { id: true, role: true } },
    },
  });

// Refuses, before anything is written, an address another kind of Account
// already holds: the script never takes a person's Account over.
export const checkStaffEmails = async (
  prisma: PrismaClient,
  staff: StudioStaff[],
): Promise<void> => {
  const administrator = await liveAccount(prisma, administratorEmail);
  if (
    administrator !== null &&
    administrator.staffMember?.role !== StaffRole.ADMINISTRATOR
  ) {
    throw new Error('administrator_email_taken');
  }
  for (const member of staff) {
    const account = await liveAccount(prisma, member.email);
    if (
      account !== null &&
      account.staffMember?.role !== roleCodes[member.role]
    ) {
      throw new Error(`staff_email_taken: ${member.key}`);
    }
  }
};

// ADR-0083's bootstrap while no Administrator has activated; once one has,
// she invites the studio's address like any «Nuevo miembro».
export const ensureAdministrator = async (
  run: StudioRun,
  name: string,
): Promise<void> => {
  const { prisma, dryRun, log } = run.context;
  const existing = await liveAccount(prisma, administratorEmail);
  const active = existing === null ? await activeAdministrator(prisma) : null;
  const action =
    existing !== null ? 'exists' : active === null ? 'bootstrap' : 'invite';
  log('android_test_administrator', { email: administratorEmail, action });
  if (action === 'exists') return;
  run.queueEmail();
  if (dryRun) return;
  if (active === null) {
    await bootstrapFirstAdministrator(
      { email: administratorEmail, name },
      run.services.bootstrap,
    );
  } else {
    await createStaffMember(
      {
        name,
        email: administratorEmail,
        phone: null,
        role: 'administrator',
        branchIds: [],
      },
      active,
      run.services.staff,
    );
  }
};

// «Nuevo miembro» on the admin web: a pending Account and its link email.
// The Administrator and the Coordinator hold every Branch without rows.
export const ensureStaff = async (
  run: StudioRun,
  staff: StudioStaff[],
  branchId: string | null,
): Promise<Map<StudioStaff['key'], string>> => {
  const { prisma, dryRun, log } = run.context;
  const ids = new Map<StudioStaff['key'], string>();
  for (const member of staff) {
    const existing = await liveAccount(prisma, member.email);
    log('android_test_staff', {
      email: member.email,
      role: member.role,
      action: existing === null ? 'invite' : 'exists',
    });
    if (existing !== null) {
      ids.set(member.key, existing.staffMember!.id);
      continue;
    }
    run.queueEmail();
    if (dryRun) continue;
    const created = await createStaffMember(
      {
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        branchIds:
          member.role === 'coordinator' || branchId === null ? [] : [branchId],
      },
      await actingAdministrator(prisma, administratorEmail),
      run.services.staff,
    );
    ids.set(member.key, created.id);
  }
  return ids;
};

// The Nutritionist's weekly availability, published as she would from the
// Staff app, one block a day; a day she already has availability on is
// skipped, so a rerun finishes a run that stopped halfway.
export const ensureNutritionistAvailability = async (
  run: StudioRun,
  nutritionistId: string | undefined,
  branchId: string | null,
): Promise<void> => {
  const { prisma, dryRun, log, now } = run.context;
  const today = boliviaDate(now());
  const covered =
    nutritionistId === undefined
      ? []
      : await prisma.availabilityBlock.findMany({
          where: {
            nutritionistStaffMemberId: nutritionistId,
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
          },
          select: { weekday: true },
        });
  const missing = nutritionistWeekdays.filter(
    (weekday) => !covered.some((block) => block.weekday === weekday),
  );
  log('android_test_nutritionist_availability', {
    action: missing.length === 0 ? 'exists' : 'publish',
    weekdays: missing,
    ...nutritionistHours,
  });
  if (missing.length === 0 || dryRun) return;
  const principal = await nutritionistPrincipal(prisma, nutritionistId!);
  for (const weekday of missing) {
    await run.services.evaluations.createAvailabilityBlock(
      {
        branchId: branchId!,
        weekday,
        ...nutritionistHours,
        effectiveFrom: today,
      },
      principal,
      randomUUID(),
    );
  }
};

import type { ScriptDefinition } from '../run-script';
import { parseStudioParams } from './android-test-studio/params';
import {
  ensureBranch,
  ensureClassTypes,
  ensurePlans,
  lowerMinimumBookings,
  reportStudioRules,
} from './android-test-studio/studio-catalog';
import {
  checkClientEmails,
  grantCourtesyAccess,
  inviteClients,
} from './android-test-studio/studio-clients';
import {
  checkStaffEmails,
  ensureAdministrator,
  ensureNutritionistAvailability,
  ensureStaff,
} from './android-test-studio/studio-people';
import { ensureWeeklySchedule } from './android-test-studio/studio-schedule';
import {
  studioServices,
  type StudioRun,
} from './android-test-studio/studio-services';

// The Android closed test (2026-11-20): production, which holds no real
// Clients and is reset afterwards, is made to look like the open studio:
// its Administrator, the Achumani Branch, the Class Types and Plans, the
// shared staff Accounts, a full week of classes, a minimum of one Booking,
// and the testers' invitations. Every write goes through the service the
// admin web or the Staff app uses. A rerun skips whatever exists, so a forced
// rerun only adds the testers it has not seen; a dry run writes nothing.
export const androidTestStudio: ScriptDefinition = {
  run: async (context) => {
    const params = parseStudioParams(context.params);
    if (context.authenticationEmail === undefined) {
      throw new Error('authentication_keys_missing');
    }
    await checkStaffEmails(context.prisma, params.staff);
    await checkClientEmails(context.prisma, params.clients);

    let emails = 0;
    const run: StudioRun = {
      context,
      services: studioServices(
        context.prisma,
        context.authenticationEmail,
        context.now,
      ),
      queueEmail: () => {
        emails += 1;
      },
    };

    await ensureAdministrator(run, params.administratorName);
    const branchId = await ensureBranch(run);
    const classTypeIds = await ensureClassTypes(run);
    await ensurePlans(run);
    const staffIds = await ensureStaff(run, params.staff, branchId);
    await ensureNutritionistAvailability(
      run,
      staffIds.get('nutricionista'),
      branchId,
    );
    await reportStudioRules(run);
    await ensureWeeklySchedule(run, {
      branchId,
      classTypeIds,
      trainerIds: [staffIds.get('instructora1'), staffIds.get('instructora2')],
    });
    await lowerMinimumBookings(run);
    await inviteClients(run, params.clients);
    await grantCourtesyAccess(run, params.clients, params.courtesyAccessEndsOn);
    context.log('android_test_studio_done', {
      dryRun: context.dryRun,
      emails,
    });
  },
};

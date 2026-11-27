import { boliviaDate } from '../../time/bolivia-time';
import type { ScriptContext, ScriptDefinition } from '../run-script';
import { activeAdministrator } from './android-test-studio/studio-principals';
import {
  findCourtesyTesters,
  quarterlyPlanName,
  resolveBranch,
  resolveQuarterlyPlan,
  type CourtesyTester,
} from './testers-quarterly-plan/courtesy-testers';
import {
  removeCourtesyExtras,
  sellQuarterlyPlan,
} from './testers-quarterly-plan/move-writes';
import {
  decideTesterMove,
  parseMoveParams,
} from './testers-quarterly-plan/tester-move';

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const codeOf = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String(error.code);
  }
  return error instanceof Error ? error.message : String(error);
};

const who = (tester: CourtesyTester) => ({
  name: tester.name,
  email: tester.email,
  courtesyPlan: tester.courtesy.planName,
  courtesyEndsOn: civil(tester.courtesyEndsOn),
});

// Owner, 2026-11-27: every tester on «Plan de cortesía» (or the older
// «Acceso de prueba»), the store review Account included, moves to a cash
// «Trimestral 36 clases» from today and loses the courtesy extras, so the
// referral code (n.º 22) and the free evaluation of a quarterly Plan work
// for them. Each write is the product's own: «Ajustar clases» removes the
// extras, and the cash sale ends the courtesy Plan the day before the new
// one. One line per Client; a dry run writes nothing; a rerun skips whoever
// already pays. A tester held or failed leaves the run failed, so it can run
// again once she is sorted out.
export const testersQuarterlyPlan: ScriptDefinition = {
  run: async (context: ScriptContext) => {
    const params = parseMoveParams(context.params);
    const { prisma, log } = context;
    const now = context.now();
    const branch = await resolveBranch(prisma, params.branch);
    const plan = await resolveQuarterlyPlan(prisma);
    const principal = await activeAdministrator(prisma);
    if (principal === null) throw new Error('administrator_missing');
    const today = boliviaDate(now);
    const testers = await findCourtesyTesters(prisma, now);
    const tally = { moved: 0, skipped: 0, blocked: 0, failed: 0 };

    for (const tester of testers) {
      const move = decideTesterMove({
        today,
        courtesy: tester.courtesy,
        hasPaidPlan: tester.hasPaidPlan,
        afterBookedClass: params.afterBookedClass,
      });
      const line = (fields: Record<string, unknown>) =>
        log('testers_quarterly_plan_client', { ...who(tester), ...fields });
      if (move.action === 'skip') {
        tally.skipped += 1;
        line({ action: 'skip', reason: move.reason });
        continue;
      }
      if (move.action === 'blocked') {
        tally.blocked += 1;
        line({
          action: 'blocked',
          reason: move.reason,
          lastBookedOn: civil(move.lastBookedOn),
        });
        continue;
      }
      if (context.dryRun) {
        line({
          action: 'move',
          extrasToRemove: move.extrasToRemove,
          startsOn: civil(move.startsOn),
          plan: quarterlyPlanName,
          priceCentavos: plan.priceCentavos,
        });
        continue;
      }
      try {
        if (move.extrasToRemove > 0) {
          await removeCourtesyExtras(prisma, {
            clientId: tester.clientId,
            subscriptionId: move.subscriptionId,
            classes: move.extrasToRemove,
            principal,
            now: context.now(),
          });
        }
        const payment = await sellQuarterlyPlan(prisma, {
          clientId: tester.clientId,
          planId: plan.id,
          branchId: branch.id,
          startsOn: move.startsOn,
          principal,
          now: context.now,
        });
        tally.moved += 1;
        line({
          action: 'moved',
          extrasRemoved: move.extrasToRemove,
          startsOn: payment.startsOn,
          paymentId: payment.id,
          amountDueCentavos: payment.amountDueCentavos,
          discountCentavos: payment.discountCentavos,
        });
      } catch (error) {
        tally.failed += 1;
        line({ action: 'failed', code: codeOf(error) });
      }
    }

    log('testers_quarterly_plan_done', {
      dryRun: context.dryRun,
      branch: branch.name,
      today: civil(today),
      testers: testers.length,
      ...tally,
    });
    if (!context.dryRun && tally.blocked + tally.failed > 0) {
      throw new Error('testers_left');
    }
  },
};

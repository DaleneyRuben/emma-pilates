import { sweepEach } from '../../jobs/sweep-each';
import type { NewNotification } from '../../notifications/prisma-notification-store';
import { lifecycleCopy } from './first-90-days-copy';
import {
  dueMilestones,
  type LifecycleMilestone,
} from './first-90-days-milestones';

export type FirstRealPlan = {
  clientId: string;
  accountId: string;
  startsOn: Date;
  sentMilestones: LifecycleMilestone[];
};

export type LifecycleSend = {
  clientId: string;
  accountId: string;
  milestone: LifecycleMilestone;
  notification: NewNotification | null;
};

type SendLifecycleMessagesDependencies = {
  today: Date;
  // The 09:00 morning the pushes go out, which stamps them.
  occurredAt: Date;
  findFirstRealPlans(): Promise<FirstRealPlan[]>;
  record(send: LifecycleSend): Promise<boolean>;
};

export const lifecycleNotification = (
  plan: Pick<FirstRealPlan, 'accountId' | 'clientId'>,
  milestone: LifecycleMilestone,
  occurredAt: Date,
): NewNotification => ({
  accountId: plan.accountId,
  category: 'reminder',
  type: `lifecycle_${milestone}`,
  businessEventKey: `lifecycle:${milestone}:${plan.clientId}`,
  title: lifecycleCopy[milestone].title,
  message: lifecycleCopy[milestone].message,
  destination: null,
  occurredAt,
});

export const sendLifecycleMessages = async (
  dependencies: SendLifecycleMessagesDependencies,
): Promise<{ sent: number }> => {
  const plans = await dependencies.findFirstRealPlans();
  let sent = 0;

  await sweepEach(
    'first_90_days',
    plans,
    (plan) => plan.clientId,
    async (plan) => {
      const alreadySent = new Set(plan.sentMilestones);
      const due = dueMilestones(plan.startsOn, dependencies.today, alreadySent);
      for (const milestone of due) {
        const latest = milestone === due.at(-1);
        const recorded = await dependencies.record({
          clientId: plan.clientId,
          accountId: plan.accountId,
          milestone,
          notification: latest
            ? lifecycleNotification(plan, milestone, dependencies.occurredAt)
            : null,
        });
        if (recorded && latest) sent += 1;
      }
    },
  );

  return { sent };
};

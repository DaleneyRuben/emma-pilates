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
  notification: NewNotification;
};

type SendLifecycleMessagesDependencies = {
  today: Date;
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

  for (const plan of plans) {
    const alreadySent = new Set(plan.sentMilestones);
    for (const milestone of dueMilestones(
      plan.startsOn,
      dependencies.today,
      alreadySent,
    )) {
      const recorded = await dependencies.record({
        clientId: plan.clientId,
        accountId: plan.accountId,
        milestone,
        notification: lifecycleNotification(
          plan,
          milestone,
          dependencies.today,
        ),
      });
      if (recorded) sent += 1;
    }
  }

  return { sent };
};

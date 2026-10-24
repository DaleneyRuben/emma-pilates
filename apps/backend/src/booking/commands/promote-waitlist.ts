import { isInsideCancellationWindow } from '../studio-settings/studio-settings';
import type { WeeklyCapSubscription } from './create-booking';
import { weeklyCapBlocks } from './weekly-cap-decision';

type WaitlistSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
};

type ActiveWaitlistEntry = {
  id: string;
  clientId: string;
  joinedByAccountId: string;
};

type PromoteWaitlistDependencies = {
  loadSession(sessionId: string): Promise<WaitlistSession | null>;
  countLiveBookings(sessionId: string): Promise<number>;
  loadActiveEntries(sessionId: string): Promise<ActiveWaitlistEntry[]>;
  findEligibleSubscription(input: {
    clientId: string;
    onDate: Date;
  }): Promise<WeeklyCapSubscription | null>;
  hasOverlappingBooking(input: {
    clientId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<boolean>;
  createBooking(input: {
    sessionId: string;
    clientId: string;
    subscriptionId: string;
    createdByAccountId: string;
  }): Promise<{ id: string }>;
  closeAsPromoted(input: { entryId: string; bookingId: string }): Promise<void>;
  cancellationWindowMinutes(): Promise<number>;
  now(): Date;
};

export const promoteWaitlist = async (
  command: { sessionId: string },
  dependencies: PromoteWaitlistDependencies,
): Promise<{ entryId: string; bookingId: string }[]> => {
  const session = await dependencies.loadSession(command.sessionId);

  if (
    session === null ||
    session.state !== 'scheduled' ||
    isInsideCancellationWindow(
      session.startsAt,
      dependencies.now(),
      await dependencies.cancellationWindowMinutes(),
    )
  ) {
    return [];
  }

  let remainingCapacity =
    session.capacity - (await dependencies.countLiveBookings(session.id));
  const promotions: { entryId: string; bookingId: string }[] = [];

  if (remainingCapacity <= 0) {
    return promotions;
  }

  const entries = await dependencies.loadActiveEntries(session.id);

  for (const entry of entries) {
    if (remainingCapacity === 0) {
      break;
    }

    const subscription = await dependencies.findEligibleSubscription({
      clientId: entry.clientId,
      onDate: session.startsAt,
    });

    if (subscription === null || weeklyCapBlocks(subscription)) {
      continue;
    }

    if (
      await dependencies.hasOverlappingBooking({
        clientId: entry.clientId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      })
    ) {
      continue;
    }

    const booking = await dependencies.createBooking({
      sessionId: session.id,
      clientId: entry.clientId,
      subscriptionId: subscription.id,
      createdByAccountId: entry.joinedByAccountId,
    });
    await dependencies.closeAsPromoted({
      entryId: entry.id,
      bookingId: booking.id,
    });
    promotions.push({ entryId: entry.id, bookingId: booking.id });
    remainingCapacity -= 1;
  }

  return promotions;
};

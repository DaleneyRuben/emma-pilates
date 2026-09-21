import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type WaitlistEntryForLeaving = {
  id: string;
  clientId: string;
  closedAt: Date | null;
  session: {
    id: string;
    branchId: string;
    startsAt: Date;
    state: 'scheduled' | 'cancelled';
  };
};

type LeaveWaitlistDependencies = {
  principal: AuthenticatedPrincipal;
  loadEntry(waitlistEntryId: string): Promise<WaitlistEntryForLeaving | null>;
  close(input: {
    waitlistEntryId: string;
    closedByAccountId: string;
    closedAt: Date;
  }): Promise<void>;
  now(): Date;
};

export const leaveWaitlist = async (
  command: { waitlistEntryId: string },
  dependencies: LeaveWaitlistDependencies,
): Promise<void> => {
  const entry = await dependencies.loadEntry(command.waitlistEntryId);

  if (
    entry === null ||
    dependencies.principal.identity.kind !== 'client' ||
    dependencies.principal.identity.clientId !== entry.clientId
  ) {
    throw new BookingAccessDeniedError();
  }

  if (entry.closedAt !== null) {
    throw new Error('Waitlist Entry is not active');
  }

  await dependencies.close({
    waitlistEntryId: entry.id,
    closedByAccountId: dependencies.principal.accountId,
    closedAt: dependencies.now(),
  });
};

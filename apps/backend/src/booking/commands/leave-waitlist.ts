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

// The Client leaves their own entry; an Assistant leaves it for the Client at
// an assigned Branch, mirroring who may join the Waitlist.
const mayLeave = (
  principal: AuthenticatedPrincipal,
  entry: WaitlistEntryForLeaving,
): boolean =>
  principal.identity.kind === 'client'
    ? principal.identity.clientId === entry.clientId
    : principal.identity.role === 'assistant' &&
      principal.identity.branchIds.includes(entry.session.branchId);

export const leaveWaitlist = async (
  command: { waitlistEntryId: string },
  dependencies: LeaveWaitlistDependencies,
): Promise<void> => {
  const entry = await dependencies.loadEntry(command.waitlistEntryId);

  if (entry === null || !mayLeave(dependencies.principal, entry)) {
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

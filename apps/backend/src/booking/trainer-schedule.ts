import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './commands/create-booking';

export type TrainerScheduleSession = {
  sessionId: string;
  classTypeName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
};

type ListTrainerScheduleDependencies = {
  principal: AuthenticatedPrincipal;
  findSessions(input: {
    trainerStaffMemberId: string;
    on: Date;
  }): Promise<TrainerScheduleSession[]>;
};

export const listTrainerSchedule = async (
  input: { on: Date },
  dependencies: ListTrainerScheduleDependencies,
): Promise<TrainerScheduleSession[]> => {
  if (
    dependencies.principal.identity.kind !== 'staff' ||
    dependencies.principal.identity.role !== 'trainer'
  ) {
    throw new BookingAccessDeniedError();
  }

  return dependencies.findSessions({
    trainerStaffMemberId: dependencies.principal.identity.staffMemberId,
    on: input.on,
  });
};

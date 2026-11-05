import type { PrismaClient } from '../generated/prisma/client';
import type { TrainerScheduleSession } from './trainer-schedule';

// FIX-042: the Trainer's Sessions on one Bolivian civil day.
export const findTrainerScheduleSessions =
  (prisma: PrismaClient) =>
  (input: {
    trainerStaffMemberId: string;
    on: Date;
    includeCancelled: boolean;
  }): Promise<TrainerScheduleSession[]> => {
    void prisma;
    void input;
    return Promise.reject(new Error('not implemented'));
  };

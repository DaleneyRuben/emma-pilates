import type { AdminSessionScheduleDto } from './administration.dto';

export const civil = (date: Date | null): string | null =>
  date === null ? null : date.toISOString().slice(0, 10);

type ScheduleRow = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: Date;
  capacity: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  classType: { durationMinutes: number; name: string };
};

export const toScheduleDto = (
  schedule: ScheduleRow,
): AdminSessionScheduleDto => ({
  id: schedule.id,
  branchId: schedule.branchId,
  classTypeId: schedule.classTypeId,
  trainerStaffMemberId: schedule.trainerStaffMemberId,
  weekday: schedule.weekday,
  startsAtLocal: schedule.startsAtLocal.toISOString().slice(11, 16),
  capacity: schedule.capacity,
  effectiveFrom: civil(schedule.effectiveFrom)!,
  effectiveUntil: civil(schedule.effectiveUntil),
  classTypeName: schedule.classType.name,
  durationMinutes: schedule.classType.durationMinutes,
});

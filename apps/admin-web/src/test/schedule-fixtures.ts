import type { AdminClassTypeDto } from "@pilates/api-contracts";
import { http } from "msw";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  weekStartOf,
} from "../lib/bolivia-time";
import { centro, page } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";

export const sessionsPath = "/api/v1/administrator/sessions";
export const schedulesPath = "/api/v1/administrator/session-schedules";
export const classTypesPath = "/api/v1/administrator/class-types";
export const staffPath = "/api/v1/administrator/staff-members";

// Specs work on next week so every date they type stays in the future.
export const nextMonday = addDays(weekStartOf(boliviaToday()), 7);
export const dayOfNextWeek = (offset: number) => addDays(nextMonday, offset);

export const reformer: AdminClassTypeDto = {
  id: "5d0c7a4e-3b1f-5b7a-8c2d-000000000001",
  name: "Reformer Pilates",
  description: "Fuerza y control en la máquina.",
  defaultCapacity: 10,
  equipmentNeeds: "Reformer",
  archivedAt: null,
};
export const mat: AdminClassTypeDto = {
  id: "5d0c7a4e-3b1f-5b7a-8c2d-000000000002",
  name: "Mat Pilates",
  description: "Clase en colchoneta.",
  defaultCapacity: 14,
  equipmentNeeds: null,
  archivedAt: null,
};

const trainer = (id: string, name: string, status = "active") => ({
  id,
  accountId: id,
  name,
  email: `${name.split(" ")[0]?.toLowerCase()}@example.com`,
  phone: null,
  role: "trainer",
  branchIds: [centro.id],
  status,
  activationExpiresAt: null,
});
export const valeria = trainer(
  "9a000000-0000-5000-8000-000000000001",
  "Valeria Peña",
);
export const daniela = trainer(
  "9a000000-0000-5000-8000-000000000002",
  "Daniela Ortiz",
);
export const retired = trainer(
  "9a000000-0000-5000-8000-000000000003",
  "Rita Salas",
  "deactivated",
);

export const weeklyScheduleId = "3c000000-0000-5000-8000-000000000001";

const session = (
  id: string,
  classType: typeof reformer,
  trainerMember: typeof valeria,
  date: string,
  time: string,
  extra: Partial<{
    capacity: number;
    bookedCount: number;
    waitlistCount: number;
    sessionScheduleId: string | null;
    minutes: number;
  }> = {},
) => {
  const startsAt = boliviaInstant(date, time);
  const capacity = extra.capacity ?? classType.defaultCapacity;
  const bookedCount = extra.bookedCount ?? 0;
  return {
    id,
    branchId: centro.id,
    branchName: centro.name,
    classTypeId: classType.id,
    trainerStaffMemberId: trainerMember.id,
    classTypeName: classType.name,
    trainerName: trainerMember.name,
    startsAt,
    endsAt: new Date(
      new Date(startsAt).getTime() + (extra.minutes ?? 50) * 60_000,
    ).toISOString(),
    capacity,
    bookedCount,
    availableSeats: Math.max(0, capacity - bookedCount),
    waitlistCount: extra.waitlistCount ?? 0,
    sessionScheduleId: extra.sessionScheduleId ?? null,
    isException: (extra.sessionScheduleId ?? null) === null,
  };
};

export const mondayReformer = session(
  "1e000000-0000-5000-8000-000000000001",
  reformer,
  valeria,
  dayOfNextWeek(0),
  "07:00",
  { bookedCount: 4, sessionScheduleId: weeklyScheduleId },
);
export const wednesdayMat = session(
  "1e000000-0000-5000-8000-000000000002",
  mat,
  daniela,
  dayOfNextWeek(2),
  "16:00",
  { capacity: 10, bookedCount: 10, waitlistCount: 3, minutes: 45 },
);
export const saturdayEmpty = session(
  "1e000000-0000-5000-8000-000000000003",
  reformer,
  daniela,
  dayOfNextWeek(5),
  "09:00",
);

export const weekSessions = [mondayReformer, wednesdayMat, saturdayEmpty];

export const mondaySchedule = {
  id: weeklyScheduleId,
  branchId: centro.id,
  classTypeId: reformer.id,
  trainerStaffMemberId: valeria.id,
  weekday: 1,
  startsAtLocal: "07:00",
  capacity: 10,
  effectiveFrom: addDays(nextMonday, -14),
  effectiveUntil: null,
  classTypeName: reformer.name,
  durationMinutes: 50,
};

// What the Session form reads: active Class Types, the Branch's Trainers,
// and its weekly schedules.
export const sessionFormHandlers = () => [
  http.get(apiUrl(classTypesPath), () =>
    jsonResponse(page([mat, reformer], { pageSize: 100 })),
  ),
  http.get(apiUrl(staffPath), () =>
    jsonResponse(page([daniela, retired, valeria], { pageSize: 100 })),
  ),
  http.get(apiUrl(schedulesPath), () => jsonResponse([mondaySchedule])),
];

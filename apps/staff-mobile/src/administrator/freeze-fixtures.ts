import type { FreezeReviewDto } from "@pilates/api-contracts";

/** Freeze reviews shared by the freeze screen specs (walkthrough finding 52). */
export const requestedFreeze: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Lucía Fernández",
  clientPhoto: null,
  planName: "Trimestral 36 clases",
  startsOn: "2026-11-09",
  endsOn: "2026-11-15",
  reason: "Viaje de trabajo",
  state: "requested",
  planEndsOn: "2027-02-05",
  planEndsOnAfter: "2027-02-12",
  decidedAt: null,
  decidedByName: null,
};

export const approvedFreeze: FreezeReviewDto = {
  id: "freeze-2",
  clientName: "Ana Rojas",
  clientPhoto: null,
  planName: "Mensual 12 clases",
  startsOn: "2026-11-30",
  endsOn: "2026-12-04",
  reason: "Operación",
  state: "approved",
  planEndsOn: "2027-01-10",
  planEndsOnAfter: "2027-01-15",
  // 10:15 in La Paz.
  decidedAt: "2026-11-08T14:15:00.000Z",
  decidedByName: "Paola Mendoza",
};

export const refusedFreeze: FreezeReviewDto = {
  id: "freeze-3",
  clientName: "Carla Vaca",
  clientPhoto: null,
  planName: "Mensual 8 clases",
  startsOn: "2026-11-20",
  endsOn: "2026-11-22",
  reason: "Feriado largo",
  state: "refused",
  planEndsOn: "2027-03-01",
  planEndsOnAfter: null,
  decidedAt: "2026-11-07T22:40:00.000Z",
  decidedByName: "Paola Mendoza",
};

export const administratorProfile = {
  id: "staff-1",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

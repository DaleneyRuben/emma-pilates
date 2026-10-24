import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

// BKM-004: the Studio Settings in force today, as the API answers them.
export const studioSettingsPath = "/api/v1/administrator/studio-settings";
export const studioRulesPath = "/api/v1/studio-rules";

export const studioSettings = {
  version: 3,
  cancellationWindowMinutes: 150,
  minimumBookings: 2,
  minimumBookingsCheckLeadMinutes: 180,
  startDateLimitDays: 14,
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
  guestPassesPerClient: 1,
  invitesPerHostPerMonth: 1,
  inviteRewardClasses: 1,
  taxRatePercent: 16,
  evaluationPriceCentavos: 7_000,
  nutritionistFeeCentavos: 5_000,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null as string | null,
  updatedAt: "2026-10-23T15:00:00.000Z",
  updatedByName: "Paola Mendoza" as string | null,
};

export const studioRules = {
  cancellationWindowMinutes: 150,
  evaluationPriceCentavos: 7_000,
  plansFromPriceCentavos: 8_000,
  startDateLimitDays: 14,
  openingDate: null,
};

export const studioRulesHandler = (rules = studioRules) =>
  http.get(apiUrl(studioRulesPath), () => jsonResponse(rules));

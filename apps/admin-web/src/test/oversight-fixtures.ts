import type {
  AdminCreditBalanceDto,
  AdminCreditPageDto,
  AdminEvaluationDto,
  AdminEvaluationPageDto,
  AdminReferralDto,
  AdminReferralPageDto,
  StaffMemberDto,
} from "@pilates/api-contracts";
import { centro } from "./booking-handlers";

export const evaluationsPath = "/api/v1/administrator/evaluations";
export const referralsPath = "/api/v1/administrator/referrals";
export const creditsPath = "/api/v1/administrator/credits";

const nutritionist = (
  suffix: string,
  name: string,
  extra: Partial<StaffMemberDto> = {},
): StaffMemberDto => ({
  id: `5f000000-0000-5000-8000-0000000001${suffix}`,
  accountId: `5a000000-0000-5000-8000-0000000001${suffix}`,
  name,
  email: `nutricion${suffix}@emmapilates.bo`,
  phone: null,
  role: "nutritionist",
  branchIds: [centro.id],
  status: "active",
  activationExpiresAt: null,
  ...extra,
});

export const veronica = nutritionist("01", "Verónica Zambrana");
export const lorena = nutritionist("02", "Lorena Iriarte", {
  status: "deactivated",
});

export const evaluationRow = (
  suffix: string,
  clientName: string,
  startsAt: string,
  extra: Partial<AdminEvaluationDto> = {},
): AdminEvaluationDto => ({
  evaluationId: `e5000000-0000-5000-8000-0000000000${suffix}`,
  clientName,
  nutritionistStaffMemberId: veronica.id,
  nutritionistName: veronica.name,
  branchId: centro.id,
  branchName: centro.name,
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + 45 * 60_000).toISOString(),
  kind: "first",
  ...extra,
});

// Monday 21 and Thursday 24 September 2026, 09:00 and 16:30 in Bolivia.
export const andreaFirst = evaluationRow(
  "01",
  "Andrea Céspedes",
  "2026-09-21T13:00:00.000Z",
);
export const danielaFollowUp = evaluationRow(
  "02",
  "Daniela Rojas Peña",
  "2026-09-24T20:30:00.000Z",
  {
    kind: "follow_up",
    nutritionistStaffMemberId: lorena.id,
    nutritionistName: lorena.name,
  },
);

export const evaluationPage = (
  items: AdminEvaluationDto[],
  extra: Partial<AdminEvaluationPageDto> = {},
): AdminEvaluationPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  ...extra,
});

export const referralRow = (
  suffix: string,
  referrerName: string,
  referredName: string,
  extra: Partial<AdminReferralDto> = {},
): AdminReferralDto => ({
  referralId: `4e000000-0000-5000-8000-0000000000${suffix}`,
  referrerName,
  referrerReferralCount: 1,
  referredName,
  registeredAt: "2026-08-02T14:00:00.000Z",
  awardedAt: "2026-08-05T15:00:00.000Z",
  state: "awarded",
  ...extra,
});

export const andreaReferredCamila = referralRow(
  "01",
  "Andrea Céspedes",
  "Camila Vargas Ortiz",
  { referrerReferralCount: 3 },
);
export const andreaReferredValeria = referralRow(
  "02",
  "Andrea Céspedes",
  "Valeria Terceros",
  {
    referrerReferralCount: 3,
    registeredAt: "2026-08-11T22:30:00.000Z",
    awardedAt: null,
    state: "pending",
  },
);

export const referralPage = (
  items: AdminReferralDto[],
  extra: Partial<AdminReferralPageDto> = {},
): AdminReferralPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  awardedCount: 27,
  pendingCount: 7,
  ...extra,
});

export const creditRow = (
  suffix: string,
  clientName: string,
  availableCentavos: number,
  extra: Partial<AdminCreditBalanceDto> = {},
): AdminCreditBalanceDto => ({
  clientId: `c2000000-0000-5000-8000-0000000000${suffix}`,
  clientName,
  availableCentavos,
  lastMovementAt: "2026-08-13T15:00:00.000Z",
  lastMovementKind: "earned",
  ...extra,
});

export const nataliaCredit = creditRow("01", "Natalia Aguilera", 16_000);
export const danielaCredit = creditRow("02", "Daniela Rojas Peña", 8_000, {
  lastMovementAt: "2026-08-01T23:30:00.000Z",
  lastMovementKind: "spent",
});

export const creditPage = (
  items: AdminCreditBalanceDto[],
  extra: Partial<AdminCreditPageDto> = {},
): AdminCreditPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  outstandingCentavos: 64_000,
  ...extra,
});

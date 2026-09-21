export type PlanSummary = {
  id: string;
  name: string;
  durationMonths: number;
  classAllowance: number;
  priceCentavos: number;
  displayOrder: number;
};

export type ClassTypeSummary = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  defaultCapacity: number;
  equipmentNeeds: string | null;
};

export type SessionSummary = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

export type SessionScheduleRecord = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: Date;
  capacity: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export type SubscriptionSummary = {
  id: string;
  planId: string;
  planNameSnapshot: string;
  durationMonthsSnapshot: number;
  originalClassAllowance: number;
  remainingClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
};

export type PromotionSummary = {
  id: string;
  headline: string;
  description: string;
  imageAssetId: string | null;
  displayOrder: number;
};

import type { UpcomingClientBooking } from '../client/client-bookings';

export type BranchSummary = {
  id: string;
  name: string;
  address: string;
};

export type ClientProfileRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  referralCode: string;
};

export type SessionDetail = {
  id: string;
  branch: BranchSummary;
  classType: {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
  };
  trainerName: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  waitlistCount: number;
};

// Date-only arguments represent Bolivia civil dates encoded at UTC midnight.
// Authorization and image delivery belong to the consuming application workflow.
export type CatalogRepository = {
  listVisiblePlans(): Promise<PlanSummary[]>;
  findClassType(id: string): Promise<ClassTypeSummary | null>;
  findSessionSchedule(id: string): Promise<SessionScheduleRecord | null>;
  listScheduledSessions(input: {
    branchId: string;
    from: Date;
    until: Date;
    limit: number;
  }): Promise<SessionSummary[]>;
  findActiveSubscription(
    clientId: string,
    onDate: Date,
  ): Promise<SubscriptionSummary | null>;
  findLatestSubscription(clientId: string): Promise<SubscriptionSummary | null>;
  listPublishedPromotions(onDate: Date): Promise<PromotionSummary[]>;
  findVisiblePlan(id: string): Promise<PlanSummary | null>;
  listBranches(): Promise<BranchSummary[]>;
  listClassTypes(): Promise<ClassTypeSummary[]>;
  findClientProfile(clientId: string): Promise<ClientProfileRecord | null>;
  saveClientProfile(
    clientId: string,
    changes: { name: string; phone: string | null },
  ): Promise<ClientProfileRecord>;
  findSessionDetail(sessionId: string): Promise<SessionDetail | null>;
  findUpcomingClientBookings(input: {
    clientId: string;
    from: Date;
  }): Promise<UpcomingClientBooking[]>;
};

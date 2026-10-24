export type PlanSummary = {
  id: string;
  name: string;
  durationDays: number;
  weeklyClassCap: number | null;
  classAllowance: number;
  priceCentavos: number;
  // Present only for a founder, and only when the Plan is discounted.
  listPriceCentavos?: number;
  displayOrder: number;
};

export type ClassTypeSummary = {
  id: string;
  name: string;
  description: string;
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
  durationMinutes: number;
  capacity: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export type SubscriptionSummary = {
  id: string;
  planId: string;
  planNameSnapshot: string;
  durationDaysSnapshot: number;
  originalClassAllowance: number;
  remainingClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
  extraClassesLine: string | null;
};

export type PromotionSummary = {
  id: string;
  headline: string;
  description: string;
  imageAssetId: string | null;
  displayOrder: number;
};

import type { ClassHistoryEntry } from '../class-history';
import type { StaffProfile } from '../staff/staff-profile';
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
  photo: { imageAssetId: string } | null;
};

export type SessionDetail = {
  id: string;
  branch: BranchSummary;
  classType: {
    id: string;
    name: string;
    description: string;
    // The Session's own length (booking ADR-0004).
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
  findFutureSubscription(
    clientId: string,
    after: Date,
  ): Promise<SubscriptionSummary | null>;
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
  findAttendedBookings(clientId: string): Promise<ClassHistoryEntry[]>;
  findStaffProfile(staffMemberId: string): Promise<StaffProfile | null>;
};

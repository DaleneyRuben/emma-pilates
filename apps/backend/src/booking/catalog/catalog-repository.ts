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
  listPublishedPromotions(onDate: Date): Promise<PromotionSummary[]>;
};

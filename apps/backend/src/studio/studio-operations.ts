import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';

export const studioOperations = Symbol('studioOperations');

export type RevenueReport = {
  month: string;
  cashCentavos: number;
  accruedCentavos: number;
  deferredCentavos: number;
  classesStillOwed: number;
};

export type MonthKpiReport = {
  month: string;
  sessionsHeld: number;
  occupancyPercent: number;
  averageStudentsTimes10: number;
  averageAttendanceTimes10: number;
  noShowPercent: number;
  activeClients: number;
  newClients: number;
  renewedClients: number;
  renewalPercent: number;
  cashCentavos?: number;
  accruedCentavos?: number;
  deferredCentavos?: number;
  classesStillOwed?: number;
};

export type RecommendationView = {
  id: string;
  rule: string;
  subject: string;
  period: string;
  detail: string;
  state: string;
};

export type MonthNarrativeView = {
  paragraphs: string[];
  actions: { text: string; because: string }[];
};

export type NarrativeQuestionView = {
  answer: string;
  refused: boolean;
};

export type StudioOperations = {
  recompute(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ month: string; sessions: number; clientMonths: number }>;
  revenue(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<RevenueReport>;
  kpis(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<MonthKpiReport>;
  recommendations(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ month: string; recommendations: RecommendationView[] }>;
  recomputeRecommendations(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ month: string; written: number }>;
  dismissRecommendation(
    input: { id: string },
    principal: AuthenticatedPrincipal,
  ): Promise<RecommendationView>;
  narrative(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<MonthNarrativeView>;
  question(
    input: { month: string; question: string },
    principal: AuthenticatedPrincipal,
  ): Promise<NarrativeQuestionView>;
};

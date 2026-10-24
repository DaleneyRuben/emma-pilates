export type SessionFactInput = {
  capacity: number;
  bookingsAtWindowClose: number;
  attended: number;
  noShows: number;
};

export type ClientMonthInput = {
  clientId: string;
  month: string;
  planDays: number;
  renewed: boolean;
};

export type MonthKpiCounts = {
  sessionsHeld: number;
  occupancyPercent: number;
  averageStudentsTimes10: number;
  averageAttendanceTimes10: number;
  noShowPercent: number;
  activeClients: number;
  newClients: number;
  renewedClients: number;
  renewalPercent: number;
};

export const monthKpis = (
  ...input: [
    {
      sessions: readonly SessionFactInput[];
      clientMonths: readonly ClientMonthInput[];
      earlierActiveClientIds: readonly string[];
    },
  ]
): MonthKpiCounts => {
  void input;
  throw new Error('month kpis are not computed yet');
};

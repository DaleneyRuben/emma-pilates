// BKO-006 / decisions section 8. Money is centavos. The rates come from the
// PayRateRule in force; this function never stores them.

export type TrainerPayRates = {
  classCentavos: number;
  includedStudents: number;
  extraStudentCentavos: number;
  minimumNotMetCentavos: number;
  commissionPercent: number;
};

export type TrainerPaySession = {
  bookingsAtWindowClose: number | null;
  cancellationCause: string | null;
};

export type TrainerPayLine = {
  kind: 'class' | 'minimum_not_met' | 'commission';
  detail: string;
  amountCentavos: number;
};

const classLine = (
  rates: TrainerPayRates,
  students: number,
): TrainerPayLine => {
  const extra = Math.max(0, students - rates.includedStudents);
  const amountCentavos =
    rates.classCentavos + extra * rates.extraStudentCentavos;
  return {
    kind: 'class',
    detail:
      extra === 0
        ? `${students} alumnas`
        : `${students} alumnas, ${extra} extra`,
    amountCentavos,
  };
};

export const trainerPay = (
  rates: TrainerPayRates,
  facts: {
    sessions: TrainerPaySession[];
    firstPlanPaymentsCentavos: number[];
  },
): { lines: TrainerPayLine[]; totalCentavos: number } => {
  const lines: TrainerPayLine[] = [
    ...facts.sessions.flatMap((session): TrainerPayLine[] => {
      if (session.cancellationCause === 'minimum_not_met') {
        return [
          {
            kind: 'minimum_not_met',
            detail: 'Mínimo no alcanzado',
            amountCentavos: rates.minimumNotMetCentavos,
          },
        ];
      }
      if (session.bookingsAtWindowClose === null) return [];
      return [classLine(rates, session.bookingsAtWindowClose)];
    }),
    ...facts.firstPlanPaymentsCentavos.map((paid): TrainerPayLine => ({
      kind: 'commission',
      detail: 'Primer plan',
      amountCentavos: Math.round((paid * rates.commissionPercent) / 100),
    })),
  ];
  return {
    lines,
    totalCentavos: lines.reduce(
      (total, line) => total + line.amountCentavos,
      0,
    ),
  };
};

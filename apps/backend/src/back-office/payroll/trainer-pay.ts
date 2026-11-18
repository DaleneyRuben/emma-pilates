import {
  bolivianosText,
  classPlaceText,
  studentsText,
  type ClassPlace,
} from './pay-line-detail';

// BKO-006 / decisions section 8. Money is centavos. The rates come from the
// PayRateRule in force; this function never stores them.

export type TrainerPayRates = {
  classCentavos: number;
  includedStudents: number;
  extraStudentCentavos: number;
  minimumNotMetCentavos: number;
  commissionPercent: number;
};

export type TrainerPaySession = ClassPlace & {
  bookingsAtWindowClose: number | null;
  cancellationCause: string | null;
};

export type TrainerFirstPlan = {
  clientName: string;
  planName: string;
  amountDueCentavos: number;
};

export type TrainerPayLine = {
  kind: 'class' | 'minimum_not_met' | 'commission';
  detail: string;
  amountCentavos: number;
};

const classLine = (
  rates: TrainerPayRates,
  session: TrainerPaySession,
  students: number,
): TrainerPayLine => {
  const place = classPlaceText(session);
  const extra = Math.max(0, students - rates.includedStudents);
  const amountCentavos =
    rates.classCentavos + extra * rates.extraStudentCentavos;
  return {
    kind: 'class',
    detail:
      extra === 0
        ? `${place} · ${studentsText(students)}`
        : `${place} · ${studentsText(students)}, ${extra} extra`,
    amountCentavos,
  };
};

export const trainerPay = (
  rates: TrainerPayRates,
  facts: {
    sessions: TrainerPaySession[];
    firstPlans: TrainerFirstPlan[];
  },
): { lines: TrainerPayLine[]; totalCentavos: number } => {
  const lines: TrainerPayLine[] = [
    ...facts.sessions.flatMap((session): TrainerPayLine[] => {
      if (session.cancellationCause === 'minimum_not_met') {
        return [
          {
            kind: 'minimum_not_met',
            detail: classPlaceText(session),
            amountCentavos: rates.minimumNotMetCentavos,
          },
        ];
      }
      if (session.bookingsAtWindowClose === null) return [];
      return [classLine(rates, session, session.bookingsAtWindowClose)];
    }),
    ...facts.firstPlans.map((first): TrainerPayLine => ({
      kind: 'commission',
      detail: `${first.clientName} · ${first.planName} · ${rates.commissionPercent} % de ${bolivianosText(first.amountDueCentavos)}`,
      amountCentavos: Math.round(
        (first.amountDueCentavos * rates.commissionPercent) / 100,
      ),
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

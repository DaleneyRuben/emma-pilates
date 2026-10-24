// BKO-007 / decisions section 9. Money is centavos. The targets come from
// the Studio Settings version in force; this function never stores them.

export type CoordinatorPayLine = {
  kind: 'base' | 'new_client' | 'bonus';
  detail: string;
  amountCentavos: number;
};

export type RenewalTargets = {
  months1To6Percent: number;
  months7To12Percent: number;
  fromMonth13Percent: number;
};

const baseCentavos = 350_000;
const bonusCentavos = 40_000;

const commissionCentavos = (client: {
  durationDays: number;
  classAllowance: number;
  broughtByTrainer: boolean;
}): number => {
  if (client.broughtByTrainer || client.classAllowance <= 1) return 0;
  if (client.durationDays === 30) return 5_000;
  if (client.durationDays === 60 || client.durationDays === 90) return 8_000;
  return 0;
};

export const coordinatorPay = (facts: {
  newClients: {
    durationDays: number;
    classAllowance: number;
    broughtByTrainer: boolean;
  }[];
  renewalRatePercent: number | null;
  renewalTargetPercent: number;
}): { lines: CoordinatorPayLine[]; totalCentavos: number } => {
  const lines: CoordinatorPayLine[] = [
    { kind: 'base', detail: 'Base', amountCentavos: baseCentavos },
    ...facts.newClients.flatMap((client): CoordinatorPayLine[] => {
      const amountCentavos = commissionCentavos(client);
      if (amountCentavos === 0) return [];
      return [{ kind: 'new_client', detail: 'Clienta nueva', amountCentavos }];
    }),
  ];
  if (
    facts.renewalRatePercent !== null &&
    facts.renewalRatePercent >= facts.renewalTargetPercent
  ) {
    lines.push({
      kind: 'bonus',
      detail: 'Bono de renovación',
      amountCentavos: bonusCentavos,
    });
  }
  return {
    lines,
    totalCentavos: lines.reduce(
      (total, line) => total + line.amountCentavos,
      0,
    ),
  };
};

const dayMs = 24 * 60 * 60 * 1_000;

// Months of operation counted from the Opening Date: the month it falls in
// is month 1, whatever day of that month it is.
export const monthOfOperation = (openingDate: Date, month: Date): number =>
  (month.getUTCFullYear() - openingDate.getUTCFullYear()) * 12 +
  (month.getUTCMonth() - openingDate.getUTCMonth()) +
  1;

export const renewalTargetPercent = (
  targets: RenewalTargets,
  monthOfOperationNumber: number,
): number => {
  if (monthOfOperationNumber <= 6) return targets.months1To6Percent;
  if (monthOfOperationNumber <= 12) return targets.months7To12Percent;
  return targets.fromMonth13Percent;
};

// Renewed means the next Plan starts before the end or within 7 days after
// it. A month with nothing ending has no rate, so no bonus.
export const renewalRatePercent = (
  ending: { endsOn: Date; nextPlanStartsOn: Date | null }[],
): number | null => {
  if (ending.length === 0) return null;
  const renewed = ending.filter((plan) => {
    if (plan.nextPlanStartsOn === null) return false;
    return plan.nextPlanStartsOn.getTime() - plan.endsOn.getTime() <= 7 * dayMs;
  }).length;
  return Math.round((renewed * 100) / ending.length);
};

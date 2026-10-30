import { renewalRateOf } from '../../booking/payments/plan-renewals';
import {
  coordinatorPay,
  monthOfOperation,
  renewalTargetPercent,
} from './coordinator-pay';

// Decisions section 9. Money is centavos. The targets come from the Studio
// Settings version in force; a later change must not need a code edit.
const openingTargets = {
  months1To6Percent: 80,
  months7To12Percent: 85,
  fromMonth13Percent: 90,
};

const client = (
  durationDays: number,
  classAllowance: number,
  broughtByTrainer = false,
) => ({ durationDays, classAllowance, broughtByTrainer });

describe('coordinator pay', () => {
  it('pays the Bs 3,500 base when nothing else is due', () => {
    const pay = coordinatorPay({
      newClients: [],
      renewalRatePercent: null,
      renewalTargetPercent: 80,
    });

    expect(pay).toEqual({
      lines: [{ kind: 'base', detail: 'Base', amountCentavos: 350_000 }],
      totalCentavos: 350_000,
    });
  });

  it('pays Bs 50 for a new Client on a 30-day Plan', () => {
    const pay = coordinatorPay({
      newClients: [client(30, 8)],
      renewalRatePercent: null,
      renewalTargetPercent: 80,
    });

    expect(pay.lines).toContainEqual({
      kind: 'new_client',
      detail: 'Clienta nueva',
      amountCentavos: 5_000,
    });
    expect(pay.totalCentavos).toBe(355_000);
  });

  it('pays Bs 80 for a new Client on a 60-day Plan and on a 90-day Plan', () => {
    const pay = coordinatorPay({
      newClients: [client(60, 16), client(90, 24)],
      renewalRatePercent: null,
      renewalTargetPercent: 80,
    });

    expect(pay.lines.filter((line) => line.kind === 'new_client')).toEqual([
      { kind: 'new_client', detail: 'Clienta nueva', amountCentavos: 8_000 },
      { kind: 'new_client', detail: 'Clienta nueva', amountCentavos: 8_000 },
    ]);
  });

  it('pays nothing for a single class or a Client a Trainer brought', () => {
    const pay = coordinatorPay({
      newClients: [client(30, 1), client(60, 16, true)],
      renewalRatePercent: null,
      renewalTargetPercent: 80,
    });

    expect(pay.lines.map((line) => line.kind)).toEqual(['base']);
    expect(pay.totalCentavos).toBe(350_000);
  });

  it('pays the Bs 400 bonus exactly at the target and not one point below', () => {
    const below = coordinatorPay({
      newClients: [],
      renewalRatePercent: 79,
      renewalTargetPercent: 80,
    });
    const at = coordinatorPay({
      newClients: [],
      renewalRatePercent: 80,
      renewalTargetPercent: 80,
    });

    expect(below.lines.map((line) => line.kind)).not.toContain('bonus');
    expect(below.totalCentavos).toBe(350_000);
    expect(at.lines).toContainEqual({
      kind: 'bonus',
      detail: 'Bono de renovación',
      amountCentavos: 40_000,
    });
    expect(at.totalCentavos).toBe(390_000);
  });
});

describe('renewal rate', () => {
  it('rates the renewed share of the real Plans ending in the month, and none when none end', () => {
    const plan = (renewed: boolean) => ({
      clientId: 'client',
      subscriptionId: 'subscription',
      endsOn: new Date('2026-09-10T00:00:00.000Z'),
      renewed,
    });

    expect(renewalRateOf([plan(true), plan(false)])).toBe(50);
    expect(renewalRateOf([])).toBeNull();
  });

  it('asks for 80 % in months 1 to 6, 85 % in months 7 to 12, and 90 % from month 13', () => {
    const opening = new Date('2026-01-15T00:00:00.000Z');
    const target = (month: string) =>
      renewalTargetPercent(
        openingTargets,
        monthOfOperation(opening, new Date(`${month}T00:00:00.000Z`)),
      );

    expect(
      monthOfOperation(opening, new Date('2026-01-01T00:00:00.000Z')),
    ).toBe(1);
    expect(target('2026-01-01')).toBe(80);
    expect(target('2026-06-01')).toBe(80);
    expect(target('2026-07-01')).toBe(85);
    expect(target('2026-12-01')).toBe(85);
    expect(target('2027-01-01')).toBe(90);
  });
});

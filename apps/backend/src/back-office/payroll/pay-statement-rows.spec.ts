import { toView, type StatementRow } from './pay-statement-rows';

const row = (role: 'TRAINER' | 'COORDINATOR'): StatementRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  staffMemberId: '22222222-2222-4222-8222-222222222222',
  month: new Date('2026-11-01T00:00:00.000Z'),
  periodStart: new Date('2026-11-01T00:00:00.000Z'),
  periodEnd: new Date('2026-12-01T00:00:00.000Z'),
  state: 'DRAFT',
  totalCentavos: 350_000,
  salaryPaymentId: null,
  staffMember: { name: 'Paula Vargas', role },
  lines: [],
});

// Finding 105: the admin web must know when a statement can be approved
// instead of offering «Aprobar» and failing with pay_statement_month_open.
describe('pay statement view', () => {
  it('says a Trainer can be approved on the day after the period', () => {
    expect(toView(row('TRAINER')).approvableOn).toEqual(
      new Date('2026-12-01T00:00:00.000Z'),
    );
  });

  it('says the Coordinator waits seven more days for the renewals', () => {
    expect(toView(row('COORDINATOR')).approvableOn).toEqual(
      new Date('2026-12-08T00:00:00.000Z'),
    );
  });
});

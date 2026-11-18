import { BadRequestException } from '@nestjs/common';
import type { BackOfficeOperations } from '../back-office-http';
import { BackOfficeError } from '../back-office-errors';
import { AdministratorPayStatementsController } from './pay-statements.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-member-id',
    role: 'administrator' as const,
  },
};
const utc = (text: string) => new Date(`${text}T00:00:00.000Z`);
const row = {
  id: 'statement-id',
  staffMemberId: 'staff-member-id',
  staffMemberName: 'Emma Vargas',
  month: utc('2026-11-01'),
  periodStart: utc('2026-11-03'),
  periodEnd: utc('2026-11-04'),
  approvableOn: utc('2026-11-04'),
  state: 'draft' as const,
  totalCentavos: 6_500,
  salaryPaymentId: null,
  lines: [],
};

// BKO-009: Sueldos asks for a month, as the released clients do, or for any
// period; the period's end is exclusive.
describe('AdministratorPayStatementsController periods', () => {
  const resolvePrincipal = jest.fn();
  const listStatements = jest.fn();
  const draftPeriodAsAdministrator = jest.fn();
  const approveStatement = jest.fn();
  const operations = {
    payStatements: {
      listStatements,
      draftPeriodAsAdministrator,
      approveStatement,
    },
  } as unknown as BackOfficeOperations;
  const controller = new AdministratorPayStatementsController(
    operations,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('reads a month as its whole period and returns the period as civil dates', async () => {
    listStatements.mockResolvedValue([row]);

    const listed = await controller.list(bearer, '2026-11');

    expect(listStatements).toHaveBeenCalledWith(
      { from: utc('2026-11-01'), until: utc('2026-12-01') },
      principal,
    );
    expect(listed).toEqual([
      expect.objectContaining({
        month: '2026-11-01',
        periodStart: '2026-11-03',
        periodEnd: '2026-11-04',
        approvableOn: '2026-11-04',
      }),
    ]);
  });

  it('lists and drafts any period between two civil dates', async () => {
    listStatements.mockResolvedValue([]);
    draftPeriodAsAdministrator.mockResolvedValue({ drafted: 2 });

    await controller.list(bearer, undefined, '2026-11-03', '2026-11-10');
    await expect(
      controller.draft(bearer, undefined, '2026-11-03', '2026-11-04'),
    ).resolves.toEqual({ drafted: 2 });

    expect(listStatements).toHaveBeenCalledWith(
      { from: utc('2026-11-03'), until: utc('2026-11-10') },
      principal,
    );
    expect(draftPeriodAsAdministrator).toHaveBeenCalledWith(
      { from: utc('2026-11-03'), until: utc('2026-11-04') },
      principal,
    );
  });

  it('refuses a missing, mixed, empty, reversed, or too long period', async () => {
    for (const [month, from, until] of [
      [undefined, undefined, undefined],
      ['2026-11', '2026-11-03', '2026-11-04'],
      [undefined, '2026-11-03', undefined],
      [undefined, '2026-11-04', '2026-11-04'],
      [undefined, '2026-11-05', '2026-11-04'],
      [undefined, '2026-02-30', '2026-03-02'],
      [undefined, '2026-01-01', '2027-01-03'],
    ]) {
      await expect(
        controller.list(bearer, month, from, until),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.draft(bearer, month, from, until),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(listStatements).not.toHaveBeenCalled();
  });

  it('answers 409 pay_statement_period_overlaps', async () => {
    draftPeriodAsAdministrator.mockRejectedValue(
      new BackOfficeError('pay_statement_period_overlaps'),
    );

    await expect(
      controller.draft(bearer, undefined, '2026-11-03', '2026-11-04'),
    ).rejects.toMatchObject({
      response: { code: 'pay_statement_period_overlaps' },
      status: 409,
    });
  });

  // Finding 112: approving pays her, so the body names the transfer's photo.
  it('approves with the receipt the body names', async () => {
    const statementId = '7b0f8f8e-4d7a-4c55-9a51-2d3c5f1e9a10';
    const receiptImageAssetId = '1f2e3d4c-5b6a-4789-8abc-def012345678';
    approveStatement.mockResolvedValue({ ...row, state: 'approved' });

    await controller.approve(bearer, statementId, { receiptImageAssetId });

    expect(approveStatement).toHaveBeenCalledWith(
      { statementId, receiptImageAssetId },
      principal,
    );
  });

  it('leaves a missing receipt to the rule and refuses a malformed one', async () => {
    const statementId = '7b0f8f8e-4d7a-4c55-9a51-2d3c5f1e9a10';
    approveStatement.mockRejectedValue(
      new BackOfficeError('salary_receipt_required'),
    );

    await expect(
      controller.approve(bearer, statementId, undefined),
    ).rejects.toMatchObject({
      response: { code: 'salary_receipt_required' },
      status: 400,
    });
    expect(approveStatement).toHaveBeenCalledWith({ statementId }, principal);
    approveStatement.mockClear();
    await expect(
      controller.approve(bearer, statementId, { receiptImageAssetId: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(approveStatement).not.toHaveBeenCalled();
  });
});

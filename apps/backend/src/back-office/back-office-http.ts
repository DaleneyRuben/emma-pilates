import { BadRequestException, HttpException } from '@nestjs/common';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import { BackOfficeError } from './back-office-errors';
import { parseUuidValue } from './back-office.dto';
import type { EquipmentOperations } from './equipment/prisma-equipment';
import type { SessionEquipment } from './equipment/prisma-session-equipment';
import type { Expenses } from './expenses/prisma-expenses';
import type { SalaryPayments } from './payroll/prisma-salary-payments';
import type { ExpenseReport } from './reports/prisma-expense-report';
import type { Supplies } from './supplies/prisma-supplies';

// What every Back Office controller shares: the operations it calls, bearer
// authentication, and the mapping of Back Office errors to RFC 9457 problems.
export const backOfficeOperations = Symbol('backOfficeOperations');

export type BackOfficeOperations = {
  supplies: Supplies;
  salaryPayments: SalaryPayments;
  expenses: Expenses;
  report: ExpenseReport;
  equipment: EquipmentOperations;
  sessionEquipment: SessionEquipment;
};

export const idempotencyHeader = {
  name: 'idempotency-key',
  required: true,
  schema: { format: 'uuid' },
} as const;

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

export const run = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BackOfficeError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

export const parsed = <Value>(
  result: { success: true; data: Value } | { success: false },
  detail: string,
): Value => {
  if (!result.success) throw invalidRequest(detail);
  return result.data;
};

export const requireId = (value: string, detail: string): string => {
  const id = parseUuidValue(value);
  if (id === null) throw invalidRequest(detail);
  return id;
};

export const requireIdempotencyKey = (value: string | undefined): string => {
  const key = parseUuidValue(value);
  if (key === null) throw invalidRequest('Idempotency-Key must be a UUID');
  return key;
};

export abstract class BackOfficeController {
  constructor(
    protected readonly operations: BackOfficeOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

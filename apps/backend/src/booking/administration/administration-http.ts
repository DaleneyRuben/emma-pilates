import { BadRequestException, HttpException } from '@nestjs/common';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseUuid } from '../booking.dto';
import { AdministrationError } from './administration-errors';
import type { CatalogAdministration } from './prisma-catalog-administration';
import type { Oversight } from './prisma-oversight';
import type { ScheduleAdministration } from './prisma-schedule-administration';

// The Administrator controllers' shared HTTP helpers, kept apart so each
// controller file can import them without importing the others.
export const administrationOperations = Symbol('administrationOperations');

export type AdministrationOperations = {
  catalog: CatalogAdministration;
  schedules: ScheduleAdministration;
  oversight: Oversight;
  cancelEvaluation: (
    evaluationId: string,
    principal: AuthenticatedPrincipal,
  ) => Promise<void>;
};

const invalidRequest = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

export const run = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AdministrationError) {
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
  const id = parseUuid(value);
  if (id === null) throw invalidRequest(detail);
  return id;
};

export abstract class AdministrationController {
  constructor(
    protected readonly operations: AdministrationOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

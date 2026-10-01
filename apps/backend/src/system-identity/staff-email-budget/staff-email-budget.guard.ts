import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import { StaffEmailThrottledError } from './admit-staff-email-request';
import type { StaffEmailPurpose } from './staff-email-budget-policy';

export const staffEmailAdmission = Symbol('staffEmailAdmission');

type StaffEmailAdmission = (command: {
  accountId: string;
  purpose: StaffEmailPurpose;
}) => Promise<void>;

const budgetPurpose = 'staffEmailBudgetPurpose';

@Injectable()
export class StaffEmailBudgetGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(staffEmailAdmission) private readonly admit: StaffEmailAdmission,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const purpose = this.reflector.get<StaffEmailPurpose>(
      budgetPurpose,
      context.getHandler(),
    );
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    let accountId: string;
    try {
      ({ accountId } = await authenticateBearer(
        this.principalResolver,
        request.headers.authorization,
        false,
      ));
    } catch (error) {
      // Not signed in: nothing to count; the handler answers its own 401.
      if (error instanceof UnauthorizedException) return true;
      throw error;
    }

    try {
      await this.admit({ accountId, purpose });
    } catch (error) {
      if (!(error instanceof StaffEmailThrottledError)) {
        throw error;
      }
      http
        .getResponse<Response>()
        .setHeader('Retry-After', String(error.retryAfterSeconds));
      throw new HttpException(
        {
          code: 'staff_email_throttled',
          detail:
            'Too many emails were requested from this Account. Try again later',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

/**
 * BE-013: the signed-in Account's request counts against its staff email
 * budget before the handler runs; a full budget answers 429 and the handler
 * never runs.
 */
export const StaffEmailBudget = (purpose: StaffEmailPurpose) =>
  applyDecorators(
    SetMetadata(budgetPurpose, purpose),
    UseGuards(StaffEmailBudgetGuard),
    ApiTooManyRequestsResponse({
      description:
        'Too many emails were requested from this Account (staff_email_throttled), or the recipient was emailed recently (email_throttled)',
      headers: {
        'Retry-After': {
          description: 'Seconds until the request may be made again',
          schema: { type: 'integer' },
        },
      },
    }),
  );

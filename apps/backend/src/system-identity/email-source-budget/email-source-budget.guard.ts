import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiHeader, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  adminClientCookieName,
  readCookie,
} from '../admin-web/admin-web-cookies';
import {
  parseClientIdentifier,
  type RequestSource,
  requestNetworkAddress,
} from '../security/request-source';
import { tooManyRequests } from '../security/too-many-requests';
import { EmailSourceThrottledError } from './admit-email-request';
import type { EmailBudgetGroup } from './email-source-budget-policy';

export const emailSourceAdmission = Symbol('emailSourceAdmission');

type EmailSourceAdmission = (
  command: RequestSource & { group: EmailBudgetGroup },
) => Promise<void>;

const budgetGroup = 'emailSourceBudgetGroup';

// The mobile installation sends its identifier as a header; the admin web
// carries the one its Login minted in a first-party cookie (ADR-0029).
const requestClientIdentifier = (request: Request): string | null =>
  parseClientIdentifier(request.headers['x-client-identifier']) ??
  readCookie(request.headers.cookie, adminClientCookieName);

@Injectable()
export class EmailSourceBudgetGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(emailSourceAdmission) private readonly admit: EmailSourceAdmission,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const group = this.reflector.get<EmailBudgetGroup>(
      budgetGroup,
      context.getHandler(),
    );
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    try {
      await this.admit({
        group,
        clientIdentifier: requestClientIdentifier(request),
        networkAddress: requestNetworkAddress(request),
      });
    } catch (error) {
      if (!(error instanceof EmailSourceThrottledError)) {
        throw error;
      }
      throw tooManyRequests(
        http.getResponse<Response>(),
        error.retryAfterSeconds,
        {
          code: 'authentication_email_throttled',
          detail:
            'Too many requests from this device or network. Try again later',
        },
      );
    }

    return true;
  }
}

/**
 * BE-012: the request counts against its client and network budgets before
 * the handler runs; a full budget answers 429 and the handler never runs.
 */
export const EmailSourceBudget = (group: EmailBudgetGroup) =>
  applyDecorators(
    SetMetadata(budgetGroup, group),
    UseGuards(EmailSourceBudgetGuard),
    ApiHeader({
      name: 'x-client-identifier',
      required: false,
      description: 'Random first-party app installation identifier',
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many requests from this device or network (authentication_email_throttled)',
      headers: {
        'Retry-After': {
          description: 'Seconds until the source may try again',
          schema: { type: 'integer' },
        },
      },
    }),
  );

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministratorSessionAvailabilityDto,
  parseAdministratorSessionQuery,
  parseUuid,
} from '../booking.dto';
import type { SessionCancellationResult } from '../commands/cancel-session';
import type { AdministratorSessionQuery } from '../sessions/administrator-sessions';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  PaymentDto,
  PaymentReviewDto,
  parseRejectPayment,
  PendingPaymentDto,
  RejectPaymentDto,
  SessionCancellationDto,
} from './payments.dto';
import { paymentCommands, runPaymentCommand } from './payments.controller';
import type { PaymentCommands } from './prisma-payment-commands';

export const receiptObjectStorage = Symbol('receiptObjectStorage');
export const cancelSessionCommand = Symbol('cancelSessionCommand');
export const administratorSessionSearch = Symbol('administratorSessionSearch');

export type AdministratorSessionSearch = (
  query: AdministratorSessionQuery,
  principal: AuthenticatedPrincipal,
) => Promise<AdministratorSessionAvailabilityDto[]>;

// The uploads storage port, narrowed to what receipt viewing needs.
export type ReceiptObjectStorage = { get(key: string): Promise<Buffer> };

export type CancelSessionHandler = (
  command: { sessionId: string },
  principal: AuthenticatedPrincipal,
) => Promise<SessionCancellationResult>;

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const requireUuid = (value: string, detail: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest(detail);
  return parsed;
};

export const receiptRoute = (paymentId: string): string =>
  `/api/v1/administrator/payments/${paymentId}/receipt`;

@Controller({ path: 'administrator/payments', version: '1' })
@ApiBearerAuth()
export class AdministratorPaymentsController {
  constructor(
    @Inject(paymentCommands) private readonly commands: PaymentCommands,
    @Inject(receiptObjectStorage)
    private readonly storage: ReceiptObjectStorage,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get('pending')
  @ApiOperation({ operationId: 'listPendingPayments' })
  @ApiOkResponse({ type: PendingPaymentDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async pending(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PendingPaymentDto[]> {
    const principal = await this.authenticate(authorization);
    return runPaymentCommand(() =>
      this.commands.listPendingPayments(principal),
    );
  }

  @Get(':paymentId')
  @ApiOperation({ operationId: 'getPaymentReview' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentReviewDto })
  @Header('Cache-Control', 'no-store')
  async review(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PaymentReviewDto> {
    const id = requireUuid(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    const review = await runPaymentCommand(() =>
      this.commands.readPaymentReview({ paymentId: id }, principal),
    );
    return {
      ...review,
      receiptUrl: review.receipt === null ? null : receiptRoute(review.id),
    };
  }

  @Get(':paymentId/receipt')
  @ApiOperation({ operationId: 'getPaymentReceipt' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async receipt(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const id = requireUuid(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    const receipt = await runPaymentCommand(() =>
      this.commands.readReceiptObject({ paymentId: id }, principal),
    );
    const bytes = await this.storage.get(receipt.objectKey);
    response.setHeader('Content-Type', receipt.mediaType);
    response.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(bytes);
  }

  @Post(':paymentId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'confirmPayment' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async confirm(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PaymentDto> {
    const id = requireUuid(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    return runPaymentCommand(() =>
      this.commands.confirmTransfer({ paymentId: id }, principal),
    );
  }

  @Post(':paymentId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'rejectPayment' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiBody({ type: RejectPaymentDto })
  @ApiOkResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async reject(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<PaymentDto> {
    const parsed = parseRejectPayment(body);
    if (parsed === null) {
      throw invalidRequest('Rejection reason must have 1 to 300 characters');
    }
    const id = requireUuid(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    return runPaymentCommand(() =>
      this.commands.rejectTransfer(
        { paymentId: id, reason: parsed.reason },
        principal,
      ),
    );
  }
}

const sessionProblems: Record<string, string> = {
  'Session is not cancellable': 'session_not_cancellable',
  'Session has no Bookings': 'session_has_no_bookings',
};

@Controller({ path: 'administrator/sessions', version: '1' })
@ApiBearerAuth()
export class AdministratorSessionsController {
  constructor(
    @Inject(cancelSessionCommand)
    private readonly cancelSession: CancelSessionHandler,
    @Inject(administratorSessionSearch)
    private readonly searchSessions: AdministratorSessionSearch,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  // API-002: the Administrator's Session search across every Branch.
  @Get()
  @ApiOperation({ operationId: 'listAdministratorSessions' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: AdministratorSessionAvailabilityDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async search(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdministratorSessionAvailabilityDto[]> {
    const parsed = parseAdministratorSessionQuery(query);
    if (parsed === null) throw invalidRequest('Invalid Session search');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.searchSessions(parsed, principal);
    } catch (error) {
      if (error instanceof BookingAccessDeniedError) {
        throw new ForbiddenException({
          code: 'booking_access_denied',
          detail: 'Booking access is denied',
        });
      }
      throw error;
    }
  }

  @Post(':sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'cancelSession' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ type: SessionCancellationDto })
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<SessionCancellationDto> {
    const id = requireUuid(sessionId, 'Invalid Session identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      return await this.cancelSession({ sessionId: id }, principal);
    } catch (error) {
      if (error instanceof BookingAccessDeniedError) {
        throw new ForbiddenException({
          code: 'booking_access_denied',
          detail: 'Booking access is denied',
        });
      }
      const code =
        error instanceof Error ? sessionProblems[error.message] : undefined;
      if (code !== undefined) {
        throw new HttpException(
          { code, detail: (error as Error).message },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { parseUuid } from '../booking.dto';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from '../payments/payment-errors';
import { AttachReceiptDto, parseAttachReceipt } from '../payments/payments.dto';
import { EvaluationRuleError } from './evaluation-errors';
import {
  ClientEvaluationDto,
  ClientEvaluationPageDto,
  civilDate,
  EvaluationAvailabilityDto,
  EvaluationSlotDto,
  parseClientEvaluationQuery,
  parseSlotQuery,
} from './evaluations.dto';
import {
  InvalidEvaluationCursorError,
  type EvaluationCommands,
} from './prisma-evaluation-commands';

export const evaluationCommands = Symbol('evaluationCommands');

// ADR-0063: Evaluation reads are private and revalidated; commands are never stored.
export const privateRead = 'private, no-cache';

export const idempotencyHeader = {
  name: 'idempotency-key',
  required: true,
  schema: { format: 'uuid' },
} as const;

export const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

export const runEvaluationCommand = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof EvaluationRuleError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    if (error instanceof BookingAccessDeniedError) {
      throw new ForbiddenException({
        code: 'booking_access_denied',
        detail: 'Booking access is denied',
      });
    }
    if (error instanceof PaymentRuleError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    if (error instanceof InvalidEvaluationCursorError) {
      throw invalidRequest('Invalid cursor');
    }
    throw error;
  }
};

export const requireIdempotencyKey = (value: string | undefined): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest('Idempotency-Key must be a UUID');
  return parsed;
};

export const requireId = (value: string, detail: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest(detail);
  return parsed;
};

@Controller({ path: 'evaluation-slots', version: '1' })
@ApiBearerAuth()
export class EvaluationSlotsController {
  constructor(
    @Inject(evaluationCommands) private readonly commands: EvaluationCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listEvaluationSlots' })
  @ApiQuery({ name: 'from', required: false, format: 'date' })
  @ApiQuery({ name: 'to', required: false, format: 'date' })
  @ApiQuery({ name: 'branchId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: EvaluationAvailabilityDto })
  @Header('Cache-Control', privateRead)
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<EvaluationAvailabilityDto> {
    const parsed = parseSlotQuery(query);
    if (parsed === null) throw invalidRequest('Invalid Evaluation slot query');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const availability = await runEvaluationCommand(() =>
      this.commands.listBookableSlots(parsed, principal),
    );

    return {
      days: availability.days.map((day) => ({
        date: civilDate(day.date),
        slots: day.slots,
      })),
      months: availability.months.map((month) => ({
        ...month,
        month: civilDate(month.month),
      })),
    };
  }

  @Get(':slotId')
  @ApiOperation({ operationId: 'getEvaluationSlot' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiOkResponse({ type: EvaluationSlotDto })
  @Header('Cache-Control', privateRead)
  async read(
    @Param('slotId') slotId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EvaluationSlotDto> {
    const id = requireId(slotId, 'Invalid Evaluation slot identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runEvaluationCommand(() =>
      this.commands.readEvaluationSlot(id, principal),
    );
  }

  @Post(':slotId/evaluations')
  @ApiOperation({ operationId: 'bookEvaluation' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiCreatedResponse({ type: ClientEvaluationDto })
  @Header('Cache-Control', 'no-store')
  async book(
    @Param('slotId') slotId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<ClientEvaluationDto> {
    const id = requireId(slotId, 'Invalid Evaluation slot identifier');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runEvaluationCommand(() =>
      this.commands.bookEvaluation(id, principal, key),
    );
  }

  @Post(':slotId/evaluation-payments')
  @ApiOperation({ operationId: 'bookPaidEvaluation' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiCreatedResponse({ type: ClientEvaluationDto })
  @Header('Cache-Control', 'no-store')
  async bookPaid(
    @Param('slotId') slotId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<ClientEvaluationDto> {
    const id = requireId(slotId, 'Invalid Evaluation slot identifier');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runEvaluationCommand(() =>
      this.commands.bookPaidEvaluation(id, principal, key),
    );
  }
}

@Controller({ path: 'evaluations', version: '1' })
@ApiBearerAuth()
export class ClientEvaluationsController {
  constructor(
    @Inject(evaluationCommands) private readonly commands: EvaluationCommands,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listEvaluations' })
  @ApiQuery({ name: 'scope', required: true, enum: ['upcoming', 'past'] })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: ClientEvaluationPageDto })
  @Header('Cache-Control', privateRead)
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<ClientEvaluationPageDto> {
    const parsed = parseClientEvaluationQuery(query);
    if (parsed === null) throw invalidRequest('Invalid Evaluation query');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return runEvaluationCommand(() =>
      this.commands.listClientEvaluations(parsed, principal),
    );
  }

  @Post(':evaluationId/receipt')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'attachEvaluationReceipt' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: AttachReceiptDto })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async attachReceipt(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<void> {
    const parsed = parseAttachReceipt(body);
    if (parsed === null) throw invalidRequest('Invalid receipt request');
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    await runEvaluationCommand(() =>
      this.commands.attachEvaluationReceipt(
        { evaluationId: id, imageAssetId: parsed.imageAssetId },
        principal,
      ),
    );
  }

  @Delete(':evaluationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelEvaluation' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    await runEvaluationCommand(() =>
      this.commands.cancelClientEvaluation(id, principal),
    );
  }
}

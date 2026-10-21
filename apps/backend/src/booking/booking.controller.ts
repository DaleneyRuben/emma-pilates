import {
  Body,
  Controller,
  Delete,
  Headers,
  Inject,
  Param,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import {
  ClassHistoryEntryDto,
  CreatedBookingDto,
  CreateBookingDto,
  parseAvailabilityQuery,
  parseCreateBooking,
  parseRescheduleBooking,
  parseUuid,
  SessionAvailabilityDto,
} from './booking.dto';
import {
  authenticateBearer,
  cancelBookingCommand,
  classHistory,
  createBookingCommand,
  invalidRequest,
  joinWaitlistCommand,
  rescheduleBookingCommand,
  rethrowAsProblem,
  sessionAvailability,
  type CancellationCommandHandler,
  type ClassHistoryHandler,
  type CommandHandler,
  type PrincipalResolver,
  type RescheduleCommandHandler,
} from './booking-controller-support';
import type { SessionAvailabilityHandler } from './session-availability';

@Controller({ path: 'sessions', version: '1' })
@ApiBearerAuth()
export class BookingController {
  constructor(
    @Inject(createBookingCommand)
    private readonly createBookingHandler: CommandHandler,
    @Inject(joinWaitlistCommand)
    private readonly joinWaitlistHandler: CommandHandler,
    @Inject(sessionAvailability)
    private readonly listAvailability: SessionAvailabilityHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listSessionAvailability' })
  @ApiQuery({ name: 'branchId', required: true, format: 'uuid' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: SessionAvailabilityDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<SessionAvailabilityDto[]> {
    await this.authenticate(authorization);
    const parsed = parseAvailabilityQuery(query);
    if (parsed === null)
      throw invalidRequest('Invalid Session availability query');
    return this.listAvailability(parsed);
  }

  @Post(':sessionId/bookings')
  @ApiOperation({ operationId: 'createBooking' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiCreatedResponse({ type: CreatedBookingDto })
  async create(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateBookingDto,
  ): Promise<CreatedBookingDto> {
    return this.execute(
      this.createBookingHandler,
      sessionId,
      authorization,
      idempotencyKey,
      body,
    );
  }

  @Post(':sessionId/waitlist-entries')
  @ApiOperation({ operationId: 'joinSessionWaitlist' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiCreatedResponse({ type: CreatedBookingDto })
  async joinWaitlist(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateBookingDto,
  ): Promise<CreatedBookingDto> {
    return this.execute(
      this.joinWaitlistHandler,
      sessionId,
      authorization,
      idempotencyKey,
      body,
    );
  }

  private async execute(
    handler: CommandHandler,
    sessionId: string,
    authorization: string | undefined,
    idempotencyKey: string | undefined,
    body: unknown,
  ): Promise<CreatedBookingDto> {
    const parsed = parseCreateBooking(body);
    if (parsed === null) throw invalidRequest('Invalid Booking request');
    const parsedSessionId = parseUuid(sessionId);
    if (parsedSessionId === null)
      throw invalidRequest('Invalid Session identifier');
    const parsedIdempotencyKey = parseUuid(idempotencyKey);
    if (parsedIdempotencyKey === null)
      throw invalidRequest('Idempotency-Key must be a UUID');
    const principal = await this.authenticate(authorization);

    try {
      return await handler(
        { sessionId: parsedSessionId, ...parsed },
        principal,
        parsedIdempotencyKey,
      );
    } catch (error) {
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'bookings', version: '1' })
@ApiBearerAuth()
export class BookingCancellationController {
  constructor(
    @Inject(cancelBookingCommand)
    private readonly cancelBookingHandler: CancellationCommandHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Delete(':bookingId')
  @ApiOperation({ operationId: 'cancelBooking' })
  @ApiParam({ name: 'bookingId', format: 'uuid' })
  @ApiNoContentResponse()
  async cancel(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const parsedBookingId = parseUuid(bookingId);
    if (parsedBookingId === null) {
      throw invalidRequest('Invalid Booking identifier');
    }

    const principal = await this.authenticate(authorization);

    try {
      await this.cancelBookingHandler(
        { bookingId: parsedBookingId },
        principal,
      );
    } catch (error) {
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'bookings', version: '1' })
@ApiBearerAuth()
export class BookingRescheduleController {
  constructor(
    @Inject(rescheduleBookingCommand)
    private readonly rescheduleBookingHandler: RescheduleCommandHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post(':bookingId/reschedule')
  @ApiOperation({ operationId: 'rescheduleBooking' })
  @ApiParam({ name: 'bookingId', format: 'uuid' })
  @ApiCreatedResponse({ type: CreatedBookingDto })
  async reschedule(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<CreatedBookingDto> {
    const parsedBookingId = parseUuid(bookingId);
    const parsed = parseRescheduleBooking(body);
    if (parsedBookingId === null || parsed === null) {
      throw invalidRequest('Invalid Reschedule request');
    }

    const principal = await this.authenticate(authorization);

    try {
      return await this.rescheduleBookingHandler(
        { bookingId: parsedBookingId, targetSessionId: parsed.targetSessionId },
        principal,
      );
    } catch (error) {
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'bookings', version: '1' })
@ApiBearerAuth()
export class ClassHistoryController {
  constructor(
    @Inject(classHistory)
    private readonly listClassHistory: ClassHistoryHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get('history')
  @ApiOperation({ operationId: 'listClassHistory' })
  @ApiOkResponse({ type: ClassHistoryEntryDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClassHistoryEntryDto[]> {
    const principal = await this.authenticate(authorization);
    try {
      return await this.listClassHistory(principal);
    } catch (error) {
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

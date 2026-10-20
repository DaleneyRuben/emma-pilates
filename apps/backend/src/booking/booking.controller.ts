import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  Inject,
  Param,
  Post,
  Get,
  Query,
  UnauthorizedException,
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
import { AuthenticationRequiredError } from '../system-identity/authentication/resolve-authenticated-principal';
import {
  ClassHistoryEntryDto,
  CreatedBookingDto,
  CreateBookingDto,
  parseAvailabilityQuery,
  parseAttendance,
  parseCalendarDate,
  parseCreateBooking,
  parseRescheduleBooking,
  parseUuid,
  SessionAvailabilityDto,
  TrainerScheduleSessionDto,
  TrainerSessionRosterDto,
} from './booking.dto';
import type { TrainerScheduleSession } from './trainer-schedule';
import type { TrainerSessionRosterResult } from './trainer-session-roster';
import { commandProblem } from './booking-command-problems';
import type { SessionAvailabilityHandler } from './session-availability';

export const createBookingCommand = Symbol('createBookingCommand');
export const joinWaitlistCommand = Symbol('joinWaitlistCommand');
export const cancelBookingCommand = Symbol('cancelBookingCommand');
export const rescheduleBookingCommand = Symbol('rescheduleBookingCommand');
export const classHistory = Symbol('classHistory');
export const recordAttendanceCommand = Symbol('recordAttendanceCommand');
export const trainerSchedule = Symbol('trainerSchedule');
export const trainerSessionRoster = Symbol('trainerSessionRoster');
export const sessionAvailability = Symbol('sessionAvailability');

type CommandHandler = (
  command: { sessionId: string; clientId?: string },
  principal: AuthenticatedPrincipal,
  idempotencyKey: string,
) => Promise<{ id: string }>;
type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
) => Promise<AuthenticatedPrincipal>;
type CancellationCommandHandler = (
  command: { bookingId: string },
  principal: AuthenticatedPrincipal,
) => Promise<void>;
type RescheduleCommandHandler = (
  command: { bookingId: string; targetSessionId: string },
  principal: AuthenticatedPrincipal,
) => Promise<{ id: string }>;
type ClassHistoryHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<ClassHistoryEntryDto[]>;
type AttendanceHandler = (
  command: {
    sessionId: string;
    outcomes: { bookingId: string; outcome: 'attended' | 'no_show' }[];
  },
  principal: AuthenticatedPrincipal,
) => Promise<void>;
type TrainerScheduleHandler = (
  input: { on: Date },
  principal: AuthenticatedPrincipal,
) => Promise<TrainerScheduleSession[]>;
type TrainerSessionRosterHandler = (
  input: { sessionId: string },
  principal: AuthenticatedPrincipal,
) => Promise<TrainerSessionRosterResult>;

const parseBearerCredential = (authorization: string | undefined): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }
  return match[1];
};

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

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
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }
      throw error;
    }
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
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }
      throw error;
    }
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
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }
      throw error;
    }
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
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }
      throw error;
    }
  }
}

@Controller({ path: 'sessions', version: '1' })
@ApiBearerAuth()
export class TrainerAttendanceController {
  constructor(
    @Inject(recordAttendanceCommand)
    private readonly recordAttendance: AttendanceHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post(':sessionId/attendance')
  @ApiOperation({ operationId: 'recordSessionAttendance' })
  async record(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<void> {
    const parsedSessionId = parseUuid(sessionId);
    const parsed = parseAttendance(body);
    if (parsedSessionId === null || parsed === null)
      throw invalidRequest('Invalid Attendance request');
    const principal = await this.authenticate(authorization);
    try {
      await this.recordAttendance(
        { sessionId: parsedSessionId, outcomes: parsed.outcomes },
        principal,
      );
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      )
        throw new UnauthorizedException('Authentication is required');
      throw error;
    }
  }
}

@Controller({ path: 'trainer/sessions', version: '1' })
@ApiBearerAuth()
export class TrainerScheduleController {
  constructor(
    @Inject(trainerSchedule)
    private readonly listTrainerSchedule: TrainerScheduleHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listTrainerSchedule' })
  @ApiQuery({ name: 'on', required: true, schema: { format: 'date' } })
  @ApiOkResponse({ type: TrainerScheduleSessionDto, isArray: true })
  async list(
    @Query('on') on: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainerScheduleSessionDto[]> {
    const parsedOn = parseCalendarDate(on);
    if (parsedOn === null) throw invalidRequest('Invalid schedule date');
    const principal = await this.authenticate(authorization);

    try {
      return await this.listTrainerSchedule({ on: parsedOn }, principal);
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      )
        throw new UnauthorizedException('Authentication is required');
      throw error;
    }
  }
}

@Controller({ path: 'trainer/sessions', version: '1' })
@ApiBearerAuth()
export class TrainerSessionRosterController {
  constructor(
    @Inject(trainerSessionRoster)
    private readonly loadTrainerSessionRoster: TrainerSessionRosterHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get(':sessionId/roster')
  @ApiOperation({ operationId: 'getTrainerSessionRoster' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ type: TrainerSessionRosterDto })
  async get(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainerSessionRosterDto> {
    const parsedSessionId = parseUuid(sessionId);
    if (parsedSessionId === null)
      throw invalidRequest('Invalid Session identifier');
    const principal = await this.authenticate(authorization);

    try {
      return await this.loadTrainerSessionRoster(
        { sessionId: parsedSessionId },
        principal,
      );
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      )
        throw new UnauthorizedException('Authentication is required');
      throw error;
    }
  }
}

import {
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import {
  parseAttendance,
  parseCalendarDate,
  parseUuid,
  TrainerScheduleSessionDto,
  TrainerSessionRosterDto,
} from './booking.dto';
import {
  authenticateBearer,
  invalidRequest,
  recordAttendanceCommand,
  rethrowAsProblem,
  trainerSchedule,
  trainerSessionRoster,
  type AttendanceHandler,
  type PrincipalResolver,
  type TrainerScheduleHandler,
  type TrainerSessionRosterHandler,
} from './booking-controller-support';

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
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
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
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
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
      return rethrowAsProblem(error);
    }
  }

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  AdministrationController,
  administrationOperations,
  parsed,
  requireId,
  run,
  type AdministrationOperations,
} from './administration-http';
import { toScheduleDto } from './schedule-mapping';
import {
  parseSchedulePause,
  SessionSchedulePauseDto,
  SessionSchedulePauseInputDto,
  SessionScheduleResumeDto,
} from './schedule-pause.dto';

// BKM-018: pause a weekly series without ending it, and resume it.
@Controller({ path: 'administrator/session-schedules', version: '1' })
@ApiBearerAuth()
export class AdministratorSchedulePauseController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post(':scheduleId/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'pauseSessionSchedule' })
  @ApiParam({ name: 'scheduleId', format: 'uuid' })
  @ApiBody({ type: SessionSchedulePauseInputDto })
  @ApiOkResponse({ type: SessionSchedulePauseDto })
  @Header('Cache-Control', 'no-store')
  async pause(
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<SessionSchedulePauseDto> {
    const id = requireId(scheduleId, 'Invalid Session Schedule identifier');
    const input = parsed(parseSchedulePause(body), 'Invalid pause');
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.pauseSchedule(
        { ...input, sessionScheduleId: id },
        principal,
      ),
    );
    return { ...result, schedule: toScheduleDto(result.schedule) };
  }

  @Post(':scheduleId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'resumeSessionSchedule' })
  @ApiParam({ name: 'scheduleId', format: 'uuid' })
  @ApiOkResponse({ type: SessionScheduleResumeDto })
  @Header('Cache-Control', 'no-store')
  async resume(
    @Param('scheduleId') scheduleId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<SessionScheduleResumeDto> {
    const id = requireId(scheduleId, 'Invalid Session Schedule identifier');
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.resumeSchedule(
        { sessionScheduleId: id },
        principal,
      ),
    );
    return { ...result, schedule: toScheduleDto(result.schedule) };
  }
}

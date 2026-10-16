import {
  Body,
  Controller,
  Header,
  Headers,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  AdministrationController,
  administrationOperations,
  parsed,
  run,
  type AdministrationOperations,
} from './administration-http';
import {
  parseScheduleBatchInput,
  SessionScheduleBatchDto,
  SessionScheduleBatchInputDto,
} from './schedule-batch.dto';
import { toScheduleDto } from './schedule-mapping';

// WEB-025: «Cada semana» with several days creates one weekly schedule per
// row in one command, all of them or none.
@Controller({ path: 'administrator/session-schedules', version: '1' })
@ApiBearerAuth()
export class AdministratorScheduleBatchController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Post('batch')
  @ApiOperation({ operationId: 'createSessionSchedules' })
  @ApiBody({ type: SessionScheduleBatchInputDto })
  @ApiCreatedResponse({ type: SessionScheduleBatchDto })
  @Header('Cache-Control', 'no-store')
  async createMany(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<SessionScheduleBatchDto> {
    const input = parsed(
      parseScheduleBatchInput(body),
      'Invalid Session Schedules',
    );
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.schedules.createSchedules(input, principal),
    );
    return {
      schedules: result.schedules.map((created) => ({
        ...created,
        schedule: toScheduleDto(created.schedule),
      })),
    };
  }
}

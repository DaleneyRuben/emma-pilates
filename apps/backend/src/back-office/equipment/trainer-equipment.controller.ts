import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  parsed,
  requireId,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import {
  EquipmentIssueDto,
  parseSessionIssueInput,
  SessionEquipmentDto,
  SessionEquipmentIssueInputDto,
} from './equipment.dto';

// S26: a Trainer reports a fault from a Session she leads (BKO-004).
@Controller({ path: 'trainer/sessions', version: '1' })
@ApiBearerAuth()
export class TrainerSessionEquipmentController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get(':sessionId/equipment')
  @ApiOperation({ operationId: 'listTrainerSessionEquipment' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ type: SessionEquipmentDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<SessionEquipmentDto> {
    const id = requireId(sessionId, 'Invalid Session identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.sessionEquipment.listSessionEquipment(
        { sessionId: id },
        principal,
      ),
    );
  }

  @Post(':sessionId/equipment-issues')
  @ApiOperation({ operationId: 'reportTrainerEquipmentIssue' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiBody({ type: SessionEquipmentIssueInputDto })
  @ApiCreatedResponse({ type: EquipmentIssueDto })
  @Header('Cache-Control', 'no-store')
  async report(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentIssueDto> {
    const id = requireId(sessionId, 'Invalid Session identifier');
    const input = parsed(parseSessionIssueInput(body), 'Invalid fault report');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.sessionEquipment.reportSessionIssue(
        { ...input, sessionId: id },
        principal,
      ),
    );
  }
}

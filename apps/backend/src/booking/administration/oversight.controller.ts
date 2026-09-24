import {
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import { runEvaluationCommand } from '../evaluations/evaluations.controller';
import {
  AdministrationController,
  administrationOperations,
  parsed,
  requireId,
  run,
  type AdministrationOperations,
} from './administration-http';
import {
  AdminCreditPageDto,
  AdminEvaluationPageDto,
  AdminReferralPageDto,
  IncomeReportDto,
  parseEvaluationListQuery,
  parseIncomeQuery,
  parseSearchListQuery,
} from './oversight.dto';

// ADM-001 slices D and E: the read-only oversight lists (AW25–AW27), the
// Administrator Evaluation cancel, and the income half of AW16.
@Controller({ path: 'administrator', version: '1' })
@ApiBearerAuth()
export class AdministratorOversightController extends AdministrationController {
  constructor(
    @Inject(administrationOperations) operations: AdministrationOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('evaluations')
  @ApiOperation({ operationId: 'listAdminEvaluations' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({
    name: 'nutritionistStaffMemberId',
    required: false,
    schema: { format: 'uuid' },
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    schema: { format: 'uuid' },
    description: 'Only the Evaluations held at this Branch',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminEvaluationPageDto })
  @Header('Cache-Control', 'no-store')
  async evaluations(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminEvaluationPageDto> {
    const input = parsed(
      parseEvaluationListQuery(query),
      'Invalid Evaluation filters',
    );
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.oversight.listEvaluations(input, principal),
    );
  }

  @Delete('evaluations/:evaluationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'cancelAdminEvaluation' })
  @ApiParam({ name: 'evaluationId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async cancelEvaluation(
    @Param('evaluationId') evaluationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(evaluationId, 'Invalid Evaluation identifier');
    const principal = await this.authenticate(authorization);
    await runEvaluationCommand(() =>
      this.operations.cancelEvaluation(id, principal),
    );
  }

  @Get('referrals')
  @ApiOperation({ operationId: 'listAdminReferrals' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminReferralPageDto })
  @Header('Cache-Control', 'no-store')
  async referrals(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminReferralPageDto> {
    const input = parsed(
      parseSearchListQuery(query),
      'Invalid Referral filters',
    );
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.listReferrals(input, principal));
  }

  @Get('credits')
  @ApiOperation({ operationId: 'listAdminCredits' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminCreditPageDto })
  @Header('Cache-Control', 'no-store')
  async credits(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminCreditPageDto> {
    const input = parsed(parseSearchListQuery(query), 'Invalid Credit filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.listCredits(input, principal));
  }

  @Get('reports/income')
  @ApiOperation({ operationId: 'getIncomeReport' })
  @ApiQuery({ name: 'from', required: true, format: 'date-time' })
  @ApiQuery({ name: 'until', required: true, format: 'date-time' })
  @ApiQuery({ name: 'branchId', required: false, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: IncomeReportDto })
  @Header('Cache-Control', 'no-store')
  async income(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<IncomeReportDto> {
    const input = parsed(parseIncomeQuery(query), 'Invalid report range');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.oversight.incomeReport(input, principal));
  }
}

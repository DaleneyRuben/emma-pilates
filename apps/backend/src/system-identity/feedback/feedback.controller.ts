import {
  BadRequestException,
  Body,
  Controller,
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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { z } from 'zod';
import {
  idempotencyHeader,
  requireIdempotencyKey,
} from '../../http/idempotency-key';
import { authenticatedPrincipalResolver } from '../authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  FeedbackError,
  feedbackApps,
  feedbackStatuses,
  type FeedbackListQuery,
  type FeedbackMessage,
  type FeedbackPage,
  type FeedbackRow,
  type FeedbackStatus,
} from './feedback';
import {
  AdminFeedbackDto,
  AdminFeedbackExportDto,
  AdminFeedbackPageDto,
  FeedbackReceiptDto,
  parseFeedbackQuery,
  parseSendFeedback,
  parseTriageFeedback,
  SendFeedbackDto,
  toAdminFeedbackDto,
  TriageFeedbackDto,
} from './feedback.dto';

export const feedbackOperations = Symbol('feedbackOperations');

export type FeedbackOperations = {
  send: (
    command: FeedbackMessage & { idempotencyKey: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<{ id: string; createdAt: Date }>;
  list: (
    query: FeedbackListQuery,
    principal: AuthenticatedPrincipal,
  ) => Promise<FeedbackPage>;
  export: (principal: AuthenticatedPrincipal) => Promise<FeedbackRow[]>;
  triage: (
    command: {
      feedbackId: string;
      status: FeedbackStatus;
      changeNote: string | null;
    },
    principal: AuthenticatedPrincipal,
  ) => Promise<FeedbackRow>;
};

const details: Record<FeedbackError['code'], string> = {
  invalid_feedback: 'Invalid Feedback',
  impersonation_forbidden:
    'Not available while seeing the app as another Staff Member',
  feedback_limit_reached: 'At most 10 Feedback in 24 hours',
  feedback_access_denied: 'Feedback triage is limited to Administrators',
  feedback_not_found: 'Feedback not found',
  idempotency_key_reused: 'This Idempotency-Key was used for other input',
};

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof FeedbackError) {
      throw new HttpException(
        { code: error.code, detail: details[error.code] },
        error.status,
      );
    }
    throw error;
  }
};

const parsed = <Value>(
  result: { success: true; data: Value } | { success: false },
  detail: string,
): Value => {
  if (!result.success) {
    throw new BadRequestException({ code: 'invalid_request', detail });
  }
  return result.data;
};

const uuid = z.uuid();

// REL-012: «Enviar comentarios» from either app, for any signed-in Account.
// Nothing here is cached (ADR-0063).
@Controller({ path: 'feedback', version: '1' })
@ApiBearerAuth()
export class FeedbackController {
  constructor(
    @Inject(feedbackOperations)
    private readonly operations: FeedbackOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'sendFeedback',
    description:
      'The app and Role come from the Account; at most 10 in 24 hours (429 feedback_limit_reached)',
  })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SendFeedbackDto })
  @ApiCreatedResponse({ type: FeedbackReceiptDto })
  @Header('Cache-Control', 'no-store')
  async send(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<FeedbackReceiptDto> {
    const message = parsed(parseSendFeedback(body), 'Invalid Feedback');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const receipt = await run(() =>
      this.operations.send({ ...message, idempotencyKey: key }, principal),
    );
    return { id: receipt.id, createdAt: receipt.createdAt.toISOString() };
  }
}

// REL-012: the admin web's «Comentarios» (ADR-0054: Administrators only).
@Controller({ path: 'administrator/feedback', version: '1' })
@ApiBearerAuth()
export class AdministratorFeedbackController {
  constructor(
    @Inject(feedbackOperations)
    private readonly operations: FeedbackOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminFeedback' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: feedbackStatuses })
  @ApiQuery({ name: 'app', required: false, enum: feedbackApps })
  @ApiOkResponse({ type: AdminFeedbackPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminFeedbackPageDto> {
    const input = parsed(parseFeedbackQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    const page = await run(() => this.operations.list(input, principal));
    return { ...page, items: page.items.map(toAdminFeedbackDto) };
  }

  @Get('export')
  @ApiOperation({
    operationId: 'exportAdminFeedback',
    description: 'Every Feedback, newest first; audited',
  })
  @ApiOkResponse({ type: AdminFeedbackExportDto })
  @Header('Cache-Control', 'no-store')
  async export(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminFeedbackExportDto> {
    const principal = await this.authenticate(authorization);
    const rows = await run(() => this.operations.export(principal));
    return { items: rows.map(toAdminFeedbackDto) };
  }

  @Post(':feedbackId/triage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'triageAdminFeedback',
    description: 'Sets the status and «Qué cambiamos»; audited',
  })
  @ApiParam({ name: 'feedbackId', format: 'uuid' })
  @ApiBody({ type: TriageFeedbackDto })
  @ApiOkResponse({ type: AdminFeedbackDto })
  @Header('Cache-Control', 'no-store')
  async triage(
    @Param('feedbackId') feedbackId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminFeedbackDto> {
    const id = parsed(
      uuid.safeParse(feedbackId),
      'Invalid Feedback identifier',
    );
    const input = parsed(parseTriageFeedback(body), 'Invalid triage');
    const principal = await this.authenticate(authorization);
    return toAdminFeedbackDto(
      await run(() =>
        this.operations.triage({ ...input, feedbackId: id }, principal),
      ),
    );
  }
}

export const feedbackControllers = [
  FeedbackController,
  AdministratorFeedbackController,
] as const;

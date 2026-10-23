import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
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
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { ClassHistoryEntryDto, parseUuid } from '../booking.dto';
import type { ClientSubscriptionSummary } from '../client/client-subscription';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { runPaymentCommand } from '../payments/payments.controller';
import {
  ClientNotFoundError,
  type AssistantCashPaymentResult,
  type AssistantClientBooking,
  type AssistantClientSummary,
  type ClientOverview,
  type PlanQuotes,
} from './assistant-clients';
import {
  AssistantCashPaymentDto,
  AssistantClientBookingDto,
  AssistantClientDto,
  ClientOverviewDto,
  parseRecordCashPayment,
  parseSearchQuery,
  PlanQuotesDto,
  RecordCashPaymentDto,
} from './assistant.dto';
import { deprecatedDurationMonths } from '../catalog/plan-validity';

export const assistantClientOperations = Symbol('assistantClientOperations');

export type AssistantClientOperations = {
  search: (
    command: { query: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<AssistantClientSummary[]>;
  overview: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientOverview>;
  bookings: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<AssistantClientBooking[]>;
  history: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientOverview['recentHistory']>;
  planQuotes: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<PlanQuotes>;
  recordCashPayment: (
    command: {
      clientId: string;
      planId: string;
      branchId: string;
      startsOn?: string;
    },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ) => Promise<AssistantCashPaymentResult>;
};

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const requireClientId = (value: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest('Invalid Client identifier');
  return parsed;
};

const requireIdempotencyKey = (value: string | undefined): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest('Idempotency-Key must be a UUID');
  return parsed;
};

const civilDate = (date: Date): string => date.toISOString().slice(0, 10);

const toSubscriptionDto = (subscription: ClientSubscriptionSummary | null) =>
  subscription === null
    ? null
    : {
        ...subscription,
        startsOn: civilDate(subscription.startsOn),
        endsOn: civilDate(subscription.endsOn),
      };

// Payment rules keep their own statuses; the two Assistant-specific outcomes
// are mapped here and everything else stays an unexpected error.
const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await runPaymentCommand(work);
  } catch (error) {
    if (error instanceof BookingAccessDeniedError) {
      throw new ForbiddenException({
        code: 'booking_access_denied',
        detail: 'Booking access is denied',
      });
    }
    if (error instanceof ClientNotFoundError) {
      throw new NotFoundException({
        code: 'client_not_found',
        detail: 'Client not found',
      });
    }
    throw error;
  }
};

@Controller({ path: 'assistant/clients', version: '1' })
@ApiBearerAuth()
export class AssistantClientsController {
  constructor(
    @Inject(assistantClientOperations)
    private readonly operations: AssistantClientOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'searchAssistantClients' })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Name, email, or phone fragment (2 to 100 characters)',
  })
  @ApiOkResponse({ type: AssistantClientDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('query') query: unknown,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AssistantClientDto[]> {
    const parsed = parseSearchQuery(query);
    if (parsed === null) {
      throw invalidRequest('Search text must have 2 to 100 characters');
    }
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.search({ query: parsed }, principal));
  }

  @Get(':clientId')
  @ApiOperation({ operationId: 'getAssistantClientOverview' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: ClientOverviewDto })
  @Header('Cache-Control', 'no-store')
  async overview(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientOverviewDto> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    const overview = await run(() =>
      this.operations.overview({ clientId: id }, principal),
    );
    return {
      ...overview,
      subscription: {
        status: overview.subscription.status,
        subscription: toSubscriptionDto(overview.subscription.subscription),
        nextSubscription: toSubscriptionDto(
          overview.subscription.nextSubscription,
        ),
      },
    };
  }

  @Get(':clientId/bookings')
  @ApiOperation({ operationId: 'listAssistantClientBookings' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: AssistantClientBookingDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async bookings(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AssistantClientBookingDto[]> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.bookings({ clientId: id }, principal));
  }

  @Get(':clientId/class-history')
  @ApiOperation({ operationId: 'listAssistantClientHistory' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: ClassHistoryEntryDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async history(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClassHistoryEntryDto[]> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.history({ clientId: id }, principal));
  }

  @Get(':clientId/plan-quotes')
  @ApiOperation({ operationId: 'quoteAssistantClientPlans' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: PlanQuotesDto })
  @Header('Cache-Control', 'no-store')
  async planQuotes(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PlanQuotesDto> {
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    const quotes = await run(() =>
      this.operations.planQuotes({ clientId: id }, principal),
    );
    return {
      creditAvailableCentavos: quotes.creditAvailableCentavos,
      plans: quotes.plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        durationDays: plan.durationDays,
        weeklyClassCap: plan.weeklyClassCap,
        durationMonths: deprecatedDurationMonths(plan.durationDays),
        classAllowance: plan.classAllowance,
        priceCentavos: plan.priceCentavos,
        ...(plan.listPriceCentavos === undefined
          ? {}
          : { listPriceCentavos: plan.listPriceCentavos }),
        creditAppliedCentavos: plan.creditAppliedCentavos,
        amountDueCentavos: plan.amountDueCentavos,
      })),
    };
  }

  @Post(':clientId/cash-payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'recordAssistantCashPayment' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiBody({ type: RecordCashPaymentDto })
  @ApiCreatedResponse({ type: AssistantCashPaymentDto })
  @Header('Cache-Control', 'no-store')
  async recordCashPayment(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AssistantCashPaymentDto> {
    const id = requireClientId(clientId);
    const key = requireIdempotencyKey(idempotencyKey);
    const parsed = parseRecordCashPayment(body);
    if (parsed === null) {
      throw invalidRequest('Cash Payment needs a Plan and a Branch');
    }
    const principal = await this.authenticate(authorization);
    const result = await run(() =>
      this.operations.recordCashPayment(
        {
          clientId: id,
          planId: parsed.planId,
          branchId: parsed.branchId,
          ...(parsed.startsOn === undefined
            ? {}
            : { startsOn: parsed.startsOn }),
        },
        principal,
        key,
      ),
    );
    return {
      payment: result.payment,
      subscription: toSubscriptionDto(result.subscription),
    };
  }
}

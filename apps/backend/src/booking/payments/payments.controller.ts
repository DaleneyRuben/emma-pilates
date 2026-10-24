import { createReadStream } from 'node:fs';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseUuid } from '../booking.dto';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from './payment-errors';
import {
  AttachReceiptDto,
  CreatePurchaseIntentDto,
  CreditDto,
  PaymentDto,
  parseAttachReceipt,
  parseCreatePurchaseIntent,
  PurchaseIntentDto,
  ReferralsDto,
  TransferInstructionsDto,
} from './payments.dto';
import type { PaymentCommands } from './prisma-payment-commands';

export const paymentCommands = Symbol('paymentCommands');
export const transferInstructions = Symbol('transferInstructions');

export type TransferInstructions = {
  qrImagePath: string;
};

export const transferQrRoute = '/api/v1/transfer-instructions/qr';

const idempotencyHeader = {
  name: 'idempotency-key',
  required: true,
  schema: { format: 'uuid' },
} as const;

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const notFound = (code: string, detail: string): NotFoundException =>
  new NotFoundException({ code, detail });

// Every payment command reports rule violations through PaymentRuleError;
// the transport keeps the code and chooses the status the rule declares.
const asProblem = (error: unknown): HttpException | null => {
  if (error instanceof PaymentRuleError) {
    return new HttpException(
      { code: error.code, detail: error.message },
      error.status,
    );
  }
  if (error instanceof BookingAccessDeniedError) {
    return new ForbiddenException({
      code: 'booking_access_denied',
      detail: 'Booking access is denied',
    });
  }
  if (
    error instanceof Error &&
    error.message === 'Rejection reason is required'
  ) {
    return invalidRequest('Rejection reason must have 1 to 300 characters');
  }
  return null;
};

export const runPaymentCommand = async <Result>(
  work: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    const problem = asProblem(error);
    if (problem !== null) throw problem;
    throw error;
  }
};

const requireIdempotencyKey = (value: string | undefined): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest('Idempotency-Key must be a UUID');
  return parsed;
};

const requireIntentId = (value: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null)
    throw invalidRequest('Invalid Purchase Intent identifier');
  return parsed;
};

abstract class AuthenticatedPaymentController {
  protected constructor(
    protected readonly commands: PaymentCommands,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

@Controller({ path: 'purchase-intents', version: '1' })
@ApiBearerAuth()
export class PurchaseIntentsController extends AuthenticatedPaymentController {
  constructor(
    @Inject(paymentCommands) commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    principalResolver: PrincipalResolver,
  ) {
    super(commands, principalResolver);
  }

  @Post()
  @ApiOperation({ operationId: 'createPurchaseIntent' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: CreatePurchaseIntentDto })
  @ApiCreatedResponse({ type: PurchaseIntentDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<PurchaseIntentDto> {
    const parsed = parseCreatePurchaseIntent(body);
    if (parsed === null)
      throw invalidRequest('Invalid Purchase Intent request');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);

    return runPaymentCommand(() =>
      this.commands.createPurchaseIntent(
        {
          planId: parsed.planId,
          ...(parsed.startsOn === undefined
            ? {}
            : { startsOn: parsed.startsOn }),
        },
        principal,
        key,
      ),
    );
  }

  @Get('current')
  @ApiOperation({ operationId: 'getCurrentPurchaseIntent' })
  @ApiOkResponse({ type: PurchaseIntentDto })
  @Header('Cache-Control', 'no-store')
  async current(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PurchaseIntentDto> {
    const principal = await this.authenticate(authorization);
    const intent = await runPaymentCommand(() =>
      this.commands.readOpenPurchaseIntent(principal),
    );
    if (intent === null) {
      throw notFound('purchase_intent_not_found', 'No open Purchase Intent');
    }
    return intent;
  }

  @Post(':purchaseIntentId/receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'attachPurchaseIntentReceipt' })
  @ApiParam({ name: 'purchaseIntentId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: AttachReceiptDto })
  @ApiOkResponse({ type: PurchaseIntentDto })
  @Header('Cache-Control', 'no-store')
  async attachReceipt(
    @Param('purchaseIntentId') purchaseIntentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<PurchaseIntentDto> {
    const parsed = parseAttachReceipt(body);
    if (parsed === null) throw invalidRequest('Invalid receipt request');
    const intentId = requireIntentId(purchaseIntentId);
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);

    return runPaymentCommand(() =>
      this.commands.attachReceipt(
        { purchaseIntentId: intentId, imageAssetId: parsed.imageAssetId },
        principal,
        key,
      ),
    );
  }

  @Post(':purchaseIntentId/submit')
  @ApiOperation({ operationId: 'submitPurchaseIntentTransfer' })
  @ApiParam({ name: 'purchaseIntentId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiCreatedResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async submit(
    @Param('purchaseIntentId') purchaseIntentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<PaymentDto> {
    const intentId = requireIntentId(purchaseIntentId);
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);

    return runPaymentCommand(() =>
      this.commands.submitTransfer(
        { purchaseIntentId: intentId },
        principal,
        key,
      ),
    );
  }
}

@Controller({ path: 'credit-purchases', version: '1' })
@ApiBearerAuth()
export class CreditPurchasesController extends AuthenticatedPaymentController {
  constructor(
    @Inject(paymentCommands) commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    principalResolver: PrincipalResolver,
  ) {
    super(commands, principalResolver);
  }

  @Post()
  @ApiOperation({ operationId: 'completeCreditPurchase' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: CreatePurchaseIntentDto })
  @ApiCreatedResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<PaymentDto> {
    const parsed = parseCreatePurchaseIntent(body);
    if (parsed === null)
      throw invalidRequest('Invalid Credit purchase request');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);

    return runPaymentCommand(() =>
      this.commands.completeCreditPurchase(
        {
          planId: parsed.planId,
          ...(parsed.startsOn === undefined
            ? {}
            : { startsOn: parsed.startsOn }),
        },
        principal,
        key,
      ),
    );
  }
}

@Controller({ path: 'payments', version: '1' })
@ApiBearerAuth()
export class ClientPaymentsController extends AuthenticatedPaymentController {
  constructor(
    @Inject(paymentCommands) commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    principalResolver: PrincipalResolver,
  ) {
    super(commands, principalResolver);
  }

  @Get('current')
  @ApiOperation({ operationId: 'getCurrentPayment' })
  @ApiOkResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async current(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PaymentDto> {
    const principal = await this.authenticate(authorization);
    const payment = await runPaymentCommand(() =>
      this.commands.readCurrentPayment(principal),
    );
    if (payment === null) throw notFound('payment_not_found', 'No Payment yet');
    return payment;
  }
}

@Controller({ path: 'clients/current/credit', version: '1' })
@ApiBearerAuth()
export class ClientCreditController extends AuthenticatedPaymentController {
  constructor(
    @Inject(paymentCommands) commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    principalResolver: PrincipalResolver,
  ) {
    super(commands, principalResolver);
  }

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientCredit' })
  @ApiOkResponse({ type: CreditDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<CreditDto> {
    const principal = await this.authenticate(authorization);
    return runPaymentCommand(async () => {
      const [summary, activity] = await Promise.all([
        this.commands.readCreditSummary(principal),
        this.commands.readCreditActivity(principal),
      ]);
      return { ...summary, activity };
    });
  }
}

@Controller({ path: 'clients/current/referrals', version: '1' })
@ApiBearerAuth()
export class ClientReferralsController extends AuthenticatedPaymentController {
  constructor(
    @Inject(paymentCommands) commands: PaymentCommands,
    @Inject(authenticatedPrincipalResolver)
    principalResolver: PrincipalResolver,
  ) {
    super(commands, principalResolver);
  }

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientReferrals' })
  @ApiOkResponse({ type: ReferralsDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ReferralsDto> {
    const principal = await this.authenticate(authorization);
    return runPaymentCommand(() => this.commands.readReferrals(principal));
  }
}

@Controller({ path: 'transfer-instructions', version: '1' })
@ApiBearerAuth()
export class TransferInstructionsController {
  constructor(
    @Inject(transferInstructions)
    private readonly instructions: TransferInstructions,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getTransferInstructions' })
  @ApiOkResponse({ type: TransferInstructionsDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TransferInstructionsDto> {
    await authenticateBearer(this.principalResolver, authorization);
    return {
      // Deprecated by PAY-003; kept empty for older mobile releases.
      beneficiaryName: '',
      bankName: '',
      accountNumber: '',
      qrImageUrl: transferQrRoute,
    };
  }

  @Get('qr')
  @ApiOperation({ operationId: 'getTransferQrImage' })
  @ApiProduces('image/png')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'image/png')
  async qr(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StreamableFile> {
    await authenticateBearer(this.principalResolver, authorization);
    return new StreamableFile(createReadStream(this.instructions.qrImagePath));
  }
}

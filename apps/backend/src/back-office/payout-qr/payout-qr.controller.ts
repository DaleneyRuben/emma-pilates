import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
import {
  isReceiptVariant,
  receiptVariants,
  type ReceiptVariant,
} from '../../uploads/private-image-object';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import { refuseWhileImpersonating } from '../../system-identity/authentication/refuse-while-impersonating';
import {
  BackOfficeController,
  backOfficeOperations,
  parsed,
  requireId,
  run,
  type BackOfficeOperations,
  type ReceiptStorage,
} from '../back-office-http';
import {
  parseSetPayoutQr,
  PayoutQrResultDto,
  SetPayoutQrDto,
  toPayoutQrDto,
} from './payout-qr.dto';

const ownImageUrl = (id: string) =>
  `/api/v1/staff-members/current/payout-qr/${id}/image`;
const administratorImageUrl = (id: string) =>
  `/api/v1/administrator/payout-qrs/${id}/image`;

// A payout QR is private and changes when its owner replaces it: read for one
// caller and never cached, as a salary receipt is (BKO-008).
const streamImage = async (
  read: (query: {
    payoutQrId: string;
    variant: ReceiptVariant;
  }) => Promise<{ objectKey: string; mediaType: string }>,
  storage: ReceiptStorage,
  input: { payoutQrId: string; variant: string | undefined },
  response: Response,
): Promise<StreamableFile> => {
  const payoutQrId = requireId(
    input.payoutQrId,
    'Invalid payout QR identifier',
  );
  const variant = input.variant ?? 'readable';
  if (!isReceiptVariant(variant)) {
    throw new BadRequestException({
      code: 'invalid_request',
      detail: 'Invalid payout QR variant',
    });
  }
  const image = await run(() => read({ payoutQrId, variant }));
  const bytes = await storage.get(image.objectKey);
  response.setHeader('Content-Type', image.mediaType);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(bytes);
};

// FIX-072: Perfil › «Mi QR de cobro», for every role on the team.
@Controller({ path: 'staff-members/current/payout-qr', version: '1' })
@ApiBearerAuth()
export class OwnPayoutQrController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
    @Inject(OBJECT_STORAGE) private readonly storage: ReceiptStorage,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'getOwnPayoutQr' })
  @ApiOkResponse({ type: PayoutQrResultDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PayoutQrResultDto> {
    const principal = await this.authenticate(authorization);
    const qr = await run(() => this.operations.payoutQrs.readOwn(principal));
    return toPayoutQrDto(qr, (current) => ownImageUrl(current.id));
  }

  @Put()
  @ApiOperation({ operationId: 'setOwnPayoutQr' })
  @ApiBody({ type: SetPayoutQrDto })
  @ApiOkResponse({ type: PayoutQrResultDto })
  @Header('Cache-Control', 'no-store')
  async set(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<PayoutQrResultDto> {
    const command = parsed(parseSetPayoutQr(body), 'Invalid payout QR');
    const principal = await this.authenticate(authorization);
    // Where her salary goes is hers to decide, never an impersonator's.
    refuseWhileImpersonating(principal);
    const qr = await run(() =>
      this.operations.payoutQrs.setOwn(command, principal),
    );
    return toPayoutQrDto(qr, (current) => ownImageUrl(current.id));
  }

  @Get(':payoutQrId/image')
  @ApiOperation({ operationId: 'getOwnPayoutQrImage' })
  @ApiParam({ name: 'payoutQrId', format: 'uuid' })
  @ApiQuery({ name: 'variant', required: false, enum: receiptVariants })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async image(
    @Param('payoutQrId') payoutQrId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const principal = await this.authenticate(authorization);
    return streamImage(
      (query) => this.operations.payoutQrs.readOwnImage(query, principal),
      this.storage,
      { payoutQrId, variant },
      response,
    );
  }
}

// FIX-072: Dinero › Sueldos pays by the person's QR, never an expired one.
@Controller({ path: 'administrator', version: '1' })
@ApiBearerAuth()
export class AdministratorPayoutQrController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
    @Inject(OBJECT_STORAGE) private readonly storage: ReceiptStorage,
  ) {
    super(operations, resolver);
  }

  @Get('staff-members/:staffMemberId/payout-qr')
  @ApiOperation({ operationId: 'getStaffMemberPayoutQr' })
  @ApiParam({ name: 'staffMemberId', format: 'uuid' })
  @ApiOkResponse({ type: PayoutQrResultDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('staffMemberId') staffMemberId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PayoutQrResultDto> {
    const id = requireId(staffMemberId, 'Invalid Staff Member identifier');
    const principal = await this.authenticate(authorization);
    const qr = await run(() =>
      this.operations.payoutQrs.readForStaffMember(
        { staffMemberId: id },
        principal,
      ),
    );
    return toPayoutQrDto(qr, (current) =>
      current.standing === 'expired' ? null : administratorImageUrl(current.id),
    );
  }

  @Get('payout-qrs/:payoutQrId/image')
  @ApiOperation({ operationId: 'getPayoutQrImage' })
  @ApiParam({ name: 'payoutQrId', format: 'uuid' })
  @ApiQuery({ name: 'variant', required: false, enum: receiptVariants })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async image(
    @Param('payoutQrId') payoutQrId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const principal = await this.authenticate(authorization);
    return streamImage(
      (query) =>
        this.operations.payoutQrs.readImageForAdministrator(query, principal),
      this.storage,
      { payoutQrId, variant },
      response,
    );
  }
}

export const payoutQrControllers = [
  OwnPayoutQrController,
  AdministratorPayoutQrController,
];

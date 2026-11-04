import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { ObjectStorage } from '../../uploads/object-storage';
import { TransferInstructionsDto } from '../payments/payments.dto';
import { readTransferQr } from './transfer-qr-image';

export const transferInstructions = Symbol('transferInstructions');

export type TransferInstructions = {
  /** The server file served until the Administrator uploads a QR (WEB-038). */
  qrImagePath: string;
  storage: ObjectStorage;
};

export const transferQrRoute = '/api/v1/transfer-instructions/qr';

// What a Client pays to: the studio's QR, for any signed-in Account.
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
    const qr = await readTransferQr(
      this.instructions.storage,
      this.instructions.qrImagePath,
    );
    if (qr === null) {
      throw new NotFoundException({
        code: 'transfer_qr_not_found',
        detail: 'No transfer QR is configured',
      });
    }
    return new StreamableFile(qr);
  }
}

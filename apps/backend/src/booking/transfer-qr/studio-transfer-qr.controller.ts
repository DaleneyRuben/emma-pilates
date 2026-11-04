import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  PayloadTooLargeException,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { requireAdministrator } from '../administration/administration-errors';
import { run } from '../administration/administration-http';
import type {
  StudioTransferQr,
  StudioTransferQrView,
} from './prisma-studio-transfer-qr';
import { StudioTransferQrDto } from './studio-transfer-qr.dto';
import {
  maxTransferQrBytes,
  TransferQrError,
  transferQrMediaTypes,
} from './transfer-qr-image';

export const studioTransferQrOperations = Symbol('studioTransferQrOperations');

type RawBodySource = Pick<Readable, 'on'>;

const tooLarge = () =>
  new PayloadTooLargeException({
    code: 'transfer_qr_too_large',
    detail: 'The QR image exceeds 5 MB',
  });

// Read like the pending-upload object: the bytes stream in as the body, and
// anything past the cap is refused without buffering it.
const readRawBody = (source: RawBodySource): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    source.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxTransferQrBytes) {
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    });
    source.on('end', () => resolve(Buffer.concat(chunks)));
    source.on('error', reject);
  });

const mediaTypeOf = (contentType: string | undefined): string =>
  (contentType ?? '').split(';')[0].trim().toLowerCase();

const runQr = <Result>(work: () => Promise<Result>): Promise<Result> =>
  run(async () => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof TransferQrError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  });

const toDto = (view: StudioTransferQrView): StudioTransferQrDto => ({
  updatedAt: view.updatedAt?.toISOString() ?? null,
});

// WEB-038 «Ajustes › QR del estudio»: the QR the apps show at
// GET /transfer-instructions/qr, replaced by the Administrator alone.
@Controller({ path: 'administrator/transfer-qr', version: '1' })
@ApiBearerAuth()
export class AdministratorTransferQrController {
  constructor(
    @Inject(studioTransferQrOperations)
    private readonly operations: StudioTransferQr,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getStudioTransferQr' })
  @ApiOkResponse({ type: StudioTransferQrDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StudioTransferQrDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return toDto(await runQr(() => this.operations.read(principal)));
  }

  @Put()
  @ApiOperation({ operationId: 'replaceStudioTransferQr' })
  @ApiConsumes(...transferQrMediaTypes)
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiOkResponse({ type: StudioTransferQrDto })
  @Header('Cache-Control', 'no-store')
  async replace(
    @Headers('authorization') authorization: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Req() request: RawBodySource,
  ): Promise<StudioTransferQrDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    // The Role is checked before a single byte is read.
    await run(() => Promise.resolve(requireAdministrator(principal)));
    if (!transferQrMediaTypes.includes(mediaTypeOf(contentType))) {
      throw new BadRequestException({
        code: 'transfer_qr_invalid_image',
        detail: 'The QR must be a JPEG, PNG or WebP image',
      });
    }
    const bytes = await readRawBody(request);
    return toDto(await runQr(() => this.operations.replace(principal, bytes)));
  }
}

export const studioTransferQrControllers = [
  AdministratorTransferQrController,
] as const;

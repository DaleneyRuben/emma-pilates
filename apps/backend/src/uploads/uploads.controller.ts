import { Readable } from 'node:stream';
import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  PayloadTooLargeException,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { AuthenticationRequiredError } from '../system-identity/authentication/resolve-authenticated-principal';
import { UploadAccessDeniedError } from './finalize-upload';
import type { ImagePurpose } from './image-purpose';
import {
  CreatePendingUploadDto,
  FinalizedUploadDto,
  parseCreatePendingUpload,
  parseUuid,
  PendingUploadDto,
} from './uploads.dto';

export const createPendingUploadCommand = Symbol('createPendingUploadCommand');
export const putPendingUploadObjectCommand = Symbol(
  'putPendingUploadObjectCommand',
);
export const finalizeUploadCommand = Symbol('finalizeUploadCommand');
export const uploadsNodeEnv = Symbol('uploadsNodeEnv');

type CreatePendingUploadHandler = (command: {
  ownerAccountId: string;
  purpose: ImagePurpose;
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
}) => Promise<{ id: string; pendingObjectKey: string; expiresAt: Date }>;

type PutPendingUploadObjectHandler = (
  command: { imageAssetId: string; bytes: Buffer },
  ownerAccountId: string,
) => Promise<void>;

type FinalizeUploadHandler = (
  command: { imageAssetId: string },
  ownerAccountId: string,
  idempotencyKey: string,
) => Promise<{ id: string; state: string }>;

type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
) => Promise<AuthenticatedPrincipal>;

type RawBodySource = Pick<Readable, 'on'>;

const maxUploadObjectBytes = 25 * 1024 * 1024;

const readRawBody = (source: RawBodySource): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    source.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxUploadObjectBytes) {
        reject(
          new PayloadTooLargeException({
            code: 'payload_too_large',
            detail: 'Upload exceeds the maximum allowed size',
          }),
        );
        return;
      }
      chunks.push(chunk);
    });
    source.on('end', () => resolve(Buffer.concat(chunks)));
    source.on('error', reject);
  });

const parseBearerCredential = (authorization: string | undefined): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }
  return match[1];
};

const invalidRequest = (detail: string): HttpException =>
  new HttpException(
    { code: 'invalid_request', detail },
    HttpStatus.BAD_REQUEST,
  );

const commandProblem = (error: Error): HttpException | null => {
  if (error instanceof UploadAccessDeniedError) {
    return new ForbiddenException({
      code: 'upload_access_denied',
      detail: 'Upload access is denied',
    });
  }

  const problems: Record<string, [string, string, number]> = {
    image_media_type_invalid: [
      'image_media_type_invalid',
      'Unsupported image media type',
      HttpStatus.BAD_REQUEST,
    ],
    image_size_invalid: [
      'image_size_invalid',
      'Invalid declared byte size',
      HttpStatus.BAD_REQUEST,
    ],
    image_checksum_invalid: [
      'image_checksum_invalid',
      'Invalid checksum',
      HttpStatus.BAD_REQUEST,
    ],
    image_too_large: [
      'image_too_large',
      'Image exceeds the maximum size for its purpose',
      HttpStatus.BAD_REQUEST,
    ],
    'Upload is not writable': [
      'upload_not_writable',
      'Upload is not writable',
      HttpStatus.CONFLICT,
    ],
    'Upload is not finalizable': [
      'upload_not_finalizable',
      'Upload is not finalizable',
      HttpStatus.CONFLICT,
    ],
    'Idempotency Key was reused with a different request': [
      'idempotency_key_reused',
      'Idempotency Key was reused with a different request',
      HttpStatus.CONFLICT,
    ],
  };
  const problem = problems[error.message];

  return problem === undefined
    ? null
    : new HttpException({ code: problem[0], detail: problem[1] }, problem[2]);
};

@Controller({ path: 'uploads', version: '1' })
@ApiBearerAuth()
export class UploadsController {
  constructor(
    @Inject(createPendingUploadCommand)
    private readonly createPendingUploadHandler: CreatePendingUploadHandler,
    @Inject(putPendingUploadObjectCommand)
    private readonly putPendingUploadObjectHandler: PutPendingUploadObjectHandler,
    @Inject(finalizeUploadCommand)
    private readonly finalizeUploadHandler: FinalizeUploadHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
    @Inject(uploadsNodeEnv) private readonly nodeEnv: string,
  ) {}

  @Post()
  @ApiOperation({ operationId: 'createPendingUpload' })
  @ApiCreatedResponse({ type: PendingUploadDto })
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreatePendingUploadDto,
  ): Promise<PendingUploadDto> {
    const parsed = parseCreatePendingUpload(body);
    if (parsed === null) {
      throw invalidRequest('Invalid pending upload request');
    }
    const principal = await this.authenticate(authorization);

    try {
      const created = await this.createPendingUploadHandler({
        ownerAccountId: principal.accountId,
        purpose: parsed.purpose,
        mediaType: parsed.mediaType,
        byteSize: parsed.byteSize,
        checksum: new Uint8Array(Buffer.from(parsed.checksum, 'base64')),
      });

      return {
        id: created.id,
        uploadUrl: `/api/v1/uploads/${created.id}/object`,
        expiresAt: created.expiresAt,
      };
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  @Put(':id/object')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'putPendingUploadObject' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  async putObject(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Req() request: RawBodySource,
  ): Promise<void> {
    if (this.nodeEnv === 'production') {
      throw new HttpException(
        {
          code: 'local_upload_disabled',
          detail: 'Direct object upload is only available in local development',
        },
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    const parsedId = parseUuid(id);
    if (parsedId === null) throw invalidRequest('Invalid Upload identifier');
    const principal = await this.authenticate(authorization);
    const bytes = await readRawBody(request);

    try {
      await this.putPendingUploadObjectHandler(
        { imageAssetId: parsedId, bytes },
        principal.accountId,
      );
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'finalizeUpload' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: FinalizedUploadDto })
  async finalize(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<FinalizedUploadDto> {
    const parsedId = parseUuid(id);
    if (parsedId === null) throw invalidRequest('Invalid Upload identifier');
    const parsedIdempotencyKey = parseUuid(idempotencyKey);
    if (parsedIdempotencyKey === null) {
      throw invalidRequest('Idempotency-Key must be a UUID');
    }
    const principal = await this.authenticate(authorization);

    try {
      return await this.finalizeUploadHandler(
        { imageAssetId: parsedId },
        principal.accountId,
        parsedIdempotencyKey,
      );
    } catch (error) {
      const problem = error instanceof Error ? commandProblem(error) : null;
      if (problem !== null) throw problem;
      throw error;
    }
  }

  private async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    try {
      return await this.principalResolver(
        parseBearerCredential(authorization),
        true,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        error instanceof UnauthorizedException
      ) {
        throw new UnauthorizedException('Authentication is required');
      }
      throw error;
    }
  }
}

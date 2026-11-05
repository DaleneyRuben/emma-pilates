import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { streamImage } from '../../../http/stream-image';
import { authenticatedPrincipalResolver } from '../../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import {
  StaffPhotoError,
  staffPhotoVariants,
  type StaffPhotoResult,
  type StaffPhotoVariant,
} from './staff-photo';
import {
  isUuid,
  parseSetStaffPhoto,
  SetStaffPhotoDto,
  StaffPhotoResultDto,
} from './staff-photo.dto';

export const staffPhotoOperations = Symbol('staffPhotoOperations');
export const staffPhotoObjectStorage = Symbol('staffPhotoObjectStorage');

export type StaffPhotoOperations = {
  setOwn: (
    command: { imageAssetId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  removeOwn: (principal: AuthenticatedPrincipal) => Promise<StaffPhotoResult>;
  setMember: (
    command: { staffMemberId: string; imageAssetId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  removeMember: (
    command: { staffMemberId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<StaffPhotoResult>;
  read: (
    query: { imageAssetId: string; variant: StaffPhotoVariant },
    principal: AuthenticatedPrincipal,
  ) => Promise<{ objectKey: string; mediaType: string }>;
};
export type StaffPhotoObjectStorage = { get(key: string): Promise<Buffer> };

const invalid = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

const isVariant = (value: unknown): value is StaffPhotoVariant =>
  typeof value === 'string' &&
  (staffPhotoVariants as readonly string[]).includes(value);

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof StaffPhotoError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

// FIX-041: Perfil's own photo (Staff app), the Administrator's and the
// Coordinator's for anyone on the team (admin web), and one read by asset for
// every signed-in surface. The read is private and revalidated with an ETag
// on the asset, which never changes its bytes (ADR-0063).
@Controller({ version: '1' })
@ApiBearerAuth()
export class StaffPhotoController {
  constructor(
    @Inject(staffPhotoOperations)
    private readonly operations: StaffPhotoOperations,
    @Inject(staffPhotoObjectStorage)
    private readonly storage: StaffPhotoObjectStorage,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Put('staff-members/current/photo')
  @ApiOperation({ operationId: 'setCurrentStaffMemberPhoto' })
  @ApiBody({ type: SetStaffPhotoDto })
  @ApiOkResponse({ type: StaffPhotoResultDto })
  @Header('Cache-Control', 'no-store')
  async setOwn(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StaffPhotoResultDto> {
    const parsed = parseSetStaffPhoto(body);
    if (parsed === null) throw invalid('Invalid profile photo request');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.setOwn(parsed, principal));
  }

  @Delete('staff-members/current/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'removeCurrentStaffMemberPhoto' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async removeOwn(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.removeOwn(principal));
  }

  @Put('administrator/staff-members/:staffMemberId/photo')
  @ApiOperation({ operationId: 'setStaffMemberPhoto' })
  @ApiBody({ type: SetStaffPhotoDto })
  @ApiOkResponse({ type: StaffPhotoResultDto })
  @Header('Cache-Control', 'no-store')
  async setMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('staffMemberId') staffMemberId: string,
    @Body() body: unknown,
  ): Promise<StaffPhotoResultDto> {
    if (!isUuid(staffMemberId)) throw invalid('Invalid Staff Member id');
    const parsed = parseSetStaffPhoto(body);
    if (parsed === null) throw invalid('Invalid profile photo request');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.setMember({ staffMemberId, ...parsed }, principal),
    );
  }

  @Delete('administrator/staff-members/:staffMemberId/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'removeStaffMemberPhoto' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async removeMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('staffMemberId') staffMemberId: string,
  ): Promise<void> {
    if (!isUuid(staffMemberId)) throw invalid('Invalid Staff Member id');
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.removeMember({ staffMemberId }, principal));
  }

  @Get('staff-photos/:imageAssetId')
  @ApiOperation({ operationId: 'getStaffPhoto' })
  @ApiQuery({ name: 'variant', required: false, enum: staffPhotoVariants })
  @ApiProduces('image/jpeg')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async photo(
    @Param('imageAssetId') imageAssetId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const chosen = variant ?? 'display';
    if (!isVariant(chosen) || !isUuid(imageAssetId)) {
      throw invalid('Invalid staff photo request');
    }
    const principal = await this.authenticate(authorization);
    const image = await run(() =>
      this.operations.read({ imageAssetId, variant: chosen }, principal),
    );
    const etag = `"${imageAssetId}-${chosen}"`;
    response.setHeader('ETag', etag);
    if (ifNoneMatch === etag) {
      response.setHeader('Cache-Control', 'private, no-cache');
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    const bytes = await this.storage.get(image.objectKey);
    return streamImage(response, bytes, image.mediaType, 'private, no-cache');
  }

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

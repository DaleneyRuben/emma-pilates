import {
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
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  idempotencyHeader,
  requireIdempotencyKey,
} from '../../http/idempotency-key';
import { streamImage } from '../../http/stream-image';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { AdministrationError } from '../administration/administration-errors';
import { parsed, requireId } from '../administration/administration-http';
import {
  promotionImageKinds,
  type ActivePromotionView,
  type PromotionImageKind,
} from './prisma-promotion-reads';
import type { PromotionCommands } from './prisma-promotion-commands';
import { PromotionError } from './promotion-rules';
import {
  AdminPromotionDto,
  parsePromotionInput,
  parsePromotionOrder,
  PromotionDto,
  PromotionInputDto,
  PromotionOrderDto,
} from './promotions.dto';

export const promotionOperations = Symbol('promotionOperations');
export const promotionObjectStorage = Symbol('promotionObjectStorage');
export type PromotionOperations = PromotionCommands;
export type PromotionObjectStorage = { get(key: string): Promise<Buffer> };

const isImageKind = (value: unknown): value is PromotionImageKind =>
  typeof value === 'string' &&
  (promotionImageKinds as readonly string[]).includes(value);

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof PromotionError ||
      error instanceof AdministrationError
    ) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

const thumbnailRoute = (promotionId: string): string =>
  `/api/v1/administrator/promotions/${promotionId}/image?variant=promotion_480`;

const toAdminDto = (
  view: Awaited<ReturnType<PromotionCommands['listPromotions']>>[number],
): AdminPromotionDto => ({
  ...view,
  image:
    view.image === null
      ? null
      : { ...view.image, thumbnailUrl: thumbnailRoute(view.id) },
});

// ADR-0077 locally: the API stands in for the public R2 origin.
export const publicImageRoute = (source: {
  imageAssetId: string;
  kind: string;
  deliveryVersion: string;
}): string =>
  `/api/v1/promotion-images/${source.imageAssetId}/${source.kind}/${source.deliveryVersion}`;

const toPromotionDto = (view: ActivePromotionView): PromotionDto => ({
  id: view.id,
  headline: view.headline,
  description: view.description,
  image: {
    sources: view.image.sources.map((source) => ({
      url: publicImageRoute(source),
      mediaType: source.mediaType,
      width: source.width,
      height: source.height,
    })),
  },
});

// Administrator-only Promotion management for the admin web (AW17, AW18,
// follow-up 39; ADR-0054). Nothing here is cached (ADR-0063).
@Controller({ path: 'administrator/promotions', version: '1' })
@ApiBearerAuth()
export class AdministratorPromotionsController {
  constructor(
    @Inject(promotionOperations)
    private readonly operations: PromotionOperations,
    @Inject(promotionObjectStorage)
    private readonly storage: PromotionObjectStorage,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminPromotions' })
  @ApiOkResponse({ type: AdminPromotionDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminPromotionDto[]> {
    const principal = await this.authenticate(authorization);
    const views = await run(() => this.operations.listPromotions(principal));
    return views.map(toAdminDto);
  }

  @Post()
  @ApiOperation({ operationId: 'createPromotion' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: PromotionInputDto })
  @ApiCreatedResponse({ type: AdminPromotionDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPromotionDto> {
    const input = parsed(parsePromotionInput(body), 'Invalid Promotion');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return toAdminDto(
      await run(() => this.operations.createPromotion(input, principal, key)),
    );
  }

  @Put('order')
  @ApiOperation({ operationId: 'reorderPromotions' })
  @ApiBody({ type: PromotionOrderDto })
  @ApiOkResponse({ type: AdminPromotionDto, isArray: true })
  @Header('Cache-Control', 'no-store')
  async reorder(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPromotionDto[]> {
    const input = parsed(parsePromotionOrder(body), 'Invalid Promotion order');
    const principal = await this.authenticate(authorization);
    const views = await run(() =>
      this.operations.reorderPromotions(input, principal),
    );
    return views.map(toAdminDto);
  }

  @Put(':promotionId')
  @ApiOperation({ operationId: 'updatePromotion' })
  @ApiParam({ name: 'promotionId', format: 'uuid' })
  @ApiBody({ type: PromotionInputDto })
  @ApiOkResponse({ type: AdminPromotionDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('promotionId') promotionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminPromotionDto> {
    const id = requireId(promotionId, 'Invalid Promotion identifier');
    const input = parsed(parsePromotionInput(body), 'Invalid Promotion');
    const principal = await this.authenticate(authorization);
    return toAdminDto(
      await run(() =>
        this.operations.updatePromotion(
          { ...input, promotionId: id },
          principal,
        ),
      ),
    );
  }

  @Post(':promotionId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'publishPromotion' })
  @ApiParam({ name: 'promotionId', format: 'uuid' })
  @ApiOkResponse({ type: AdminPromotionDto })
  @Header('Cache-Control', 'no-store')
  async publish(
    @Param('promotionId') promotionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminPromotionDto> {
    const id = requireId(promotionId, 'Invalid Promotion identifier');
    const principal = await this.authenticate(authorization);
    return toAdminDto(
      await run(() =>
        this.operations.publishPromotion({ promotionId: id }, principal),
      ),
    );
  }

  @Post(':promotionId/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'unpublishPromotion' })
  @ApiParam({ name: 'promotionId', format: 'uuid' })
  @ApiOkResponse({ type: AdminPromotionDto })
  @Header('Cache-Control', 'no-store')
  async unpublish(
    @Param('promotionId') promotionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminPromotionDto> {
    const id = requireId(promotionId, 'Invalid Promotion identifier');
    const principal = await this.authenticate(authorization);
    return toAdminDto(
      await run(() =>
        this.operations.unpublishPromotion({ promotionId: id }, principal),
      ),
    );
  }

  @Delete(':promotionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deletePromotion' })
  @ApiParam({ name: 'promotionId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async remove(
    @Param('promotionId') promotionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(promotionId, 'Invalid Promotion identifier');
    const principal = await this.authenticate(authorization);
    await run(() =>
      this.operations.archivePromotion({ promotionId: id }, principal),
    );
  }

  @Get(':promotionId/image')
  @ApiOperation({ operationId: 'getAdminPromotionImage' })
  @ApiParam({ name: 'promotionId', format: 'uuid' })
  @ApiQuery({ name: 'variant', required: true, enum: promotionImageKinds })
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async image(
    @Param('promotionId') promotionId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const id = requireId(promotionId, 'Invalid Promotion identifier');
    if (!isImageKind(variant)) {
      throw new HttpException(
        { code: 'invalid_request', detail: 'Invalid Promotion image variant' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const principal = await this.authenticate(authorization);
    const image = await run(() =>
      this.operations.readPromotionImage(
        { promotionId: id, kind: variant },
        principal,
      ),
    );
    const bytes = await this.storage.get(image.objectKey);
    return streamImage(response, bytes, image.mediaType, 'no-store');
  }
}

// Client 02: the active carousel for any signed-in Account (ADR-0077).
@Controller({ path: 'promotions', version: '1' })
@ApiBearerAuth()
export class PromotionsController {
  constructor(
    @Inject(promotionOperations)
    private readonly operations: PromotionOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listPromotions' })
  @ApiOkResponse({ type: PromotionDto, isArray: true })
  @Header('Cache-Control', 'private, no-cache')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PromotionDto[]> {
    await authenticateBearer(this.principalResolver, authorization);
    const views = await this.operations.listActivePromotions();
    return views.map(toPromotionDto);
  }
}

// The public, versioned, immutable image route standing in for the R2 origin
// locally; only live public copies answer (ADR-0077, ADR-0063).
@Controller({ path: 'promotion-images', version: '1' })
export class PromotionImagesController {
  constructor(
    @Inject(promotionOperations)
    private readonly operations: PromotionOperations,
    @Inject(promotionObjectStorage)
    private readonly storage: PromotionObjectStorage,
  ) {}

  @Get(':imageAssetId/:kind/:deliveryVersion')
  @ApiOperation({ operationId: 'getPromotionImage' })
  @ApiParam({ name: 'imageAssetId', format: 'uuid' })
  @ApiParam({ name: 'kind', enum: promotionImageKinds })
  @ApiParam({ name: 'deliveryVersion', format: 'uuid' })
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async image(
    @Param('imageAssetId') imageAssetId: string,
    @Param('kind') kind: string,
    @Param('deliveryVersion') deliveryVersion: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const notFound = () =>
      new NotFoundException({
        code: 'promotion_image_not_found',
        detail: 'Promotion image not found',
      });
    const assetId = requireId(imageAssetId, 'Invalid image identifier');
    const version = requireId(deliveryVersion, 'Invalid image version');
    if (!isImageKind(kind)) throw notFound();
    const image = await this.operations.readPublicImage({
      imageAssetId: assetId,
      kind,
      deliveryVersion: version,
    });
    if (image === null) throw notFound();
    const bytes = await this.storage.get(image.objectKey);
    return streamImage(
      response,
      bytes,
      image.mediaType,
      'public, max-age=31536000, immutable',
    );
  }
}

export const promotionControllers = [
  AdministratorPromotionsController,
  PromotionsController,
  PromotionImagesController,
] as const;

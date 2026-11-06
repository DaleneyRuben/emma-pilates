import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpException,
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
import { authenticatedPrincipalResolver } from '../../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { requireId } from '../../administration/administration-http';
import { BookingAccessDeniedError } from '../../commands/create-booking';
import {
  InvoiceFileError,
  type ClientInvoiceView,
  type InvoiceFileObject,
  type StaffInvoiceFilter,
  type StaffInvoiceView,
} from './invoice-file';
import {
  AttachInvoiceDto,
  attachInvoiceSchema,
  ClientInvoiceListDto,
  StaffInvoiceDto,
  staffInvoiceFilters,
  StaffInvoiceListDto,
} from './invoice-file.dto';

export const invoiceFileOperations = Symbol('invoiceFileOperations');

type Principal = AuthenticatedPrincipal;

export type InvoiceFileOperations = {
  list: (
    filter: StaffInvoiceFilter,
    p: Principal,
  ) => Promise<StaffInvoiceView[]>;
  read: (paymentId: string, p: Principal) => Promise<StaffInvoiceView>;
  attach: (
    command: { paymentId: string; imageAssetId: string; fileName?: string },
    p: Principal,
  ) => Promise<StaffInvoiceView>;
  remove: (paymentId: string, p: Principal) => Promise<StaffInvoiceView>;
  staffFile: (paymentId: string, p: Principal) => Promise<InvoiceFileObject>;
  clientList: (p: Principal) => Promise<ClientInvoiceView[]>;
  clientFile: (paymentId: string, p: Principal) => Promise<InvoiceFileObject>;
  readObject: (objectKey: string) => Promise<Buffer>;
};

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof InvoiceFileError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    if (error instanceof BookingAccessDeniedError) {
      throw new ForbiddenException({
        code: 'booking_access_denied',
        detail: 'Booking access is denied',
      });
    }
    throw error;
  }
};

const extensionOf = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// The download is an attachment named for the Client, never the storage key.
const sendFile = async (
  operations: InvoiceFileOperations,
  file: InvoiceFileObject,
  response: Response,
): Promise<StreamableFile> => {
  const bytes = await operations.readObject(file.objectKey);
  // The extension always matches what is served: a PDF named «x.html»
  // downloads as «x.pdf».
  const stem = file.fileName.replace(/\.[^.]{1,8}$/, '') || 'factura';
  const fullName = `${stem}.${extensionOf[file.mediaType]}`;
  const asciiName = fullName.replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(fullName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  response.setHeader('Content-Type', file.mediaType);
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
  );
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(bytes);
};

abstract class AuthenticatedController {
  constructor(
    protected readonly operations: InvoiceFileOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

// FIX-044 (E4, E5, W1): the Administrator, the Coordinator and the Assistant
// upload, replace and remove the issued invoice of a confirmed payment.
@Controller({ path: 'staff', version: '1' })
@ApiBearerAuth()
export class StaffInvoiceController extends AuthenticatedController {
  constructor(
    @Inject(invoiceFileOperations) operations: InvoiceFileOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get('invoices')
  @ApiOperation({ operationId: 'listStaffInvoices' })
  @ApiQuery({ name: 'filter', required: false, enum: staffInvoiceFilters })
  @ApiOkResponse({ type: StaffInvoiceListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Query('filter') filter: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffInvoiceListDto> {
    const chosen = filter ?? 'pending';
    if (!(staffInvoiceFilters as readonly string[]).includes(chosen)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid invoice filter',
      });
    }
    const principal = await this.authenticate(authorization);
    const items = await run(() =>
      this.operations.list(chosen as StaffInvoiceFilter, principal),
    );
    return { items };
  }

  @Get('payments/:paymentId/invoice')
  @ApiOperation({ operationId: 'getStaffPaymentInvoice' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ type: StaffInvoiceDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffInvoiceDto> {
    const id = requireId(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.read(id, principal));
  }

  @Put('payments/:paymentId/invoice')
  @ApiOperation({ operationId: 'attachStaffPaymentInvoice' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiBody({ type: AttachInvoiceDto })
  @ApiOkResponse({ type: StaffInvoiceDto })
  @Header('Cache-Control', 'no-store')
  async attach(
    @Param('paymentId') paymentId: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffInvoiceDto> {
    const id = requireId(paymentId, 'Invalid Payment identifier');
    const parsed = attachInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid invoice upload',
      });
    }
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.attach({ paymentId: id, ...parsed.data }, principal),
    );
  }

  @Delete('payments/:paymentId/invoice')
  @ApiOperation({ operationId: 'removeStaffPaymentInvoice' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ type: StaffInvoiceDto })
  @Header('Cache-Control', 'no-store')
  async remove(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffInvoiceDto> {
    const id = requireId(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.remove(id, principal));
  }

  @Get('payments/:paymentId/invoice/file')
  @ApiOperation({ operationId: 'getStaffPaymentInvoiceFile' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async file(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const id = requireId(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    const file = await run(() => this.operations.staffFile(id, principal));
    return sendFile(this.operations, file, response);
  }
}

// FIX-044 (K2, K3): «Mis facturas», the Client's own invoices.
@Controller({ path: 'clients/current/invoices', version: '1' })
@ApiBearerAuth()
export class ClientInvoiceController extends AuthenticatedController {
  constructor(
    @Inject(invoiceFileOperations) operations: InvoiceFileOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listCurrentClientInvoices' })
  @ApiOkResponse({ type: ClientInvoiceListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ClientInvoiceListDto> {
    const principal = await this.authenticate(authorization);
    const items = await run(() => this.operations.clientList(principal));
    return { items };
  }

  @Get(':paymentId/file')
  @ApiOperation({ operationId: 'getCurrentClientInvoiceFile' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async file(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const id = requireId(paymentId, 'Invalid Payment identifier');
    const principal = await this.authenticate(authorization);
    const file = await run(() => this.operations.clientFile(id, principal));
    return sendFile(this.operations, file, response);
  }
}

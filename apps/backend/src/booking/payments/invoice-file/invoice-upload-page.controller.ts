import {
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { authenticatedPrincipalResolver } from '../../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../../system-identity/authentication/bearer-principal';
import { requireId } from '../../administration/administration-http';
import {
  AuthenticatedController,
  invoiceFileOperations,
  run,
  sendPage,
  type InvoiceFileOperations,
} from './invoice-file.controller';

// Walkthrough n.º 24 (E-D29): the Staff app uploads a chosen PDF at once and
// shows its pages before «Subir factura» attaches it. Only the Staff Member
// who uploaded it, in a Role that handles invoices, reads it back.
@Controller({ path: 'staff/invoice-uploads', version: '1' })
@ApiBearerAuth()
export class StaffInvoiceUploadController extends AuthenticatedController {
  constructor(
    @Inject(invoiceFileOperations) operations: InvoiceFileOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get(':imageAssetId/pages/:page')
  @ApiOperation({ operationId: 'getStaffInvoiceUploadPage' })
  @ApiParam({ name: 'imageAssetId', format: 'uuid' })
  @ApiParam({ name: 'page', schema: { type: 'integer', minimum: 1 } })
  @ApiProduces('image/png')
  @ApiOkResponse({
    schema: { type: 'string', format: 'binary' },
    headers: { 'X-Page-Count': { schema: { type: 'integer' } } },
  })
  async page(
    @Param('imageAssetId') imageAssetId: string,
    @Param('page') page: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const id = requireId(imageAssetId, 'Invalid upload identifier');
    const principal = await this.authenticate(authorization);
    const file = await run(() => this.operations.uploadedFile(id, principal));
    return sendPage(this.operations, file, page, response);
  }
}

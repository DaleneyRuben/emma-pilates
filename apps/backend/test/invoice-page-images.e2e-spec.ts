import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ClientInvoiceController,
  invoiceFileOperations,
  StaffInvoiceController,
} from '../src/booking/payments/invoice-file/invoice-file.controller';
import {
  PdfPageNotFoundError,
  renderPdfPage,
} from '../src/booking/payments/invoice-file/pdf-page-image';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

// FIX-051 (verification n.º 45, design follow-up 256 § 3): the apps show a
// PDF invoice as PNG images of its pages, with the page count in a header.

const bearer = `Bearer ${'a'.repeat(43)}`;
const paymentId = '22222222-2222-4222-8222-222222222222';
const pdfFile = {
  objectKey: 'private/invoice/asset/document',
  mediaType: 'application/pdf',
  fileName: 'Factura.pdf',
};

/** A real two-page PDF with Helvetica text, offsets computed. */
const twoPagePdf = (): Buffer => {
  const pages = ['Factura 204', 'Pagina dos'];
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [3 0 R 5 0 R] /Count ${pages.length} >>`,
  ];
  pages.forEach((text, index) => {
    const stream = `BT /F1 32 Tf 72 760 Td (${text}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
};

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('renderPdfPage', () => {
  it('draws a page 1400 wide as a PNG and counts the pages', async () => {
    const image = await renderPdfPage(twoPagePdf(), 2);

    expect(image.pageCount).toBe(2);
    expect(image.png.subarray(0, 4).equals(pngSignature)).toBe(true);
    expect(image.png.readUInt32BE(16)).toBe(1400);
  });

  it('refuses a page the document does not have', async () => {
    await expect(renderPdfPage(twoPagePdf(), 3)).rejects.toBeInstanceOf(
      PdfPageNotFoundError,
    );
  });
});

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('Invoice page images (e2e)', () => {
  let app: INestApplication<App>;
  const principal: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session',
    identity: { kind: 'client', clientId: 'client-id' },
  };
  const operations = {
    list: operation(),
    read: operation(),
    attach: operation(),
    remove: operation(),
    staffFile: operation(),
    clientList: operation(),
    clientFile: operation(),
    readObject: operation(),
    renderPage: operation(),
  };

  beforeEach(async () => {
    operations.staffFile.mockResolvedValue(pdfFile);
    operations.clientFile.mockResolvedValue(pdfFile);
    operations.readObject.mockResolvedValue(Buffer.from('%PDF-1.7\n%%EOF\n'));
    operations.renderPage.mockResolvedValue({
      png: Buffer.concat([pngSignature, Buffer.from('rest')]),
      pageCount: 2,
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffInvoiceController, ClientInvoiceController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: () => Promise.resolve(principal),
        },
        { provide: invoiceFileOperations, useValue: operations },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each([
    ['client', `/api/v1/clients/current/invoices/${paymentId}/file/pages/2`],
    ['staff', `/api/v1/staff/payments/${paymentId}/invoice/file/pages/2`],
  ])(
    'serves the %s a page as an uncached PNG with the page count',
    async (_, path) => {
      await request(app.getHttpServer())
        .get(path)
        .set('authorization', bearer)
        .expect(200)
        .expect('Content-Type', 'image/png')
        .expect('Cache-Control', 'no-store')
        .expect('X-Page-Count', '2');
      expect(operations.readObject).toHaveBeenCalledWith(pdfFile.objectKey);
      expect(operations.renderPage).toHaveBeenCalledWith(expect.any(Buffer), 2);
    },
  );

  it('answers a missing page as not found', async () => {
    operations.renderPage.mockRejectedValueOnce(new PdfPageNotFoundError(2));

    await request(app.getHttpServer())
      .get(`/api/v1/clients/current/invoices/${paymentId}/file/pages/3`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('invoice_page_not_found'),
      );
  });

  it('has no pages for a photo and refuses a page that is not a number', async () => {
    operations.clientFile.mockResolvedValueOnce({
      ...pdfFile,
      mediaType: 'image/jpeg',
    });

    await request(app.getHttpServer())
      .get(`/api/v1/clients/current/invoices/${paymentId}/file/pages/1`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('invoice_not_pdf'),
      );
    await request(app.getHttpServer())
      .get(`/api/v1/clients/current/invoices/${paymentId}/file/pages/0`)
      .set('authorization', bearer)
      .expect(400);
    expect(operations.renderPage).not.toHaveBeenCalled();
  });
});

import {
  PdfPageNotFoundError,
  PdfPageUnreadableError,
  renderPdfPage,
} from '../src/booking/payments/invoice-file/pdf-page-image';
import { pdfWithPages } from './pdf-fixtures';

// FIX-051 (ADR-0110): pdf.js draws one page of an invoice as a PNG. It runs
// here, not in the unit suite, because pdf.js is an ES module.

const pngSize = (png: Buffer) => ({
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
});
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('renderPdfPage', () => {
  it('draws a page 1400 wide as a PNG and counts the pages', async () => {
    const pdf = pdfWithPages([{ text: 'Factura 204' }, { text: 'Pagina dos' }]);

    const image = await renderPdfPage(pdf, 2);

    expect(image.pageCount).toBe(2);
    expect(image.png.subarray(0, 4).equals(pngSignature)).toBe(true);
    expect(pngSize(image.png).width).toBe(1400);
  });

  it('refuses a page the document does not have', async () => {
    const pdf = pdfWithPages([{ text: 'Factura 204' }, { text: 'Pagina dos' }]);

    await expect(renderPdfPage(pdf, 3)).rejects.toBeInstanceOf(
      PdfPageNotFoundError,
    );
  });

  // Review of FIX-051: a strip 1 pt wide and 20 000 pt tall must not ask the
  // canvas for gigabytes; the page shrinks to fit 1400 × 4000.
  it('keeps a very tall page inside 1400 × 4000', async () => {
    const pdf = pdfWithPages([{ text: 'x', mediaBox: '0 0 1 20000' }]);

    const { width, height } = pngSize((await renderPdfPage(pdf, 1)).png);

    expect(width).toBeLessThanOrEqual(1400);
    expect(height).toBeLessThanOrEqual(4000);
  });

  it.each([
    [
      'a page with no width',
      pdfWithPages([{ text: 'x', mediaBox: '0 0 0 842' }]),
    ],
    ['bytes that are not a PDF', Buffer.from('%PDF-1.7\nnot really\n%%EOF\n')],
  ])('refuses %s as unreadable', async (_, pdf) => {
    await expect(renderPdfPage(pdf, 1)).rejects.toBeInstanceOf(
      PdfPageUnreadableError,
    );
  });
});

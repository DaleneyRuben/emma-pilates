import { createCanvas } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// FIX-051 (verification n.º 45, design follow-up 256 § 3, ADR-0110): the
// apps show a PDF invoice as images of its pages, drawn here with Mozilla's
// pdf.js on @napi-rs/canvas, so neither app needs a native PDF viewer and the
// change ships over the air. Only staff upload invoices, and pdf.js 6 never
// evaluates a document's scripts.

export type PdfPageImage = { png: Buffer; pageCount: number };

export class PdfPageNotFoundError extends Error {
  constructor(readonly pageCount: number) {
    super('PDF page not found');
  }
}

/** Wide enough to read when pinched on a tablet, small enough to send. */
const targetWidth = 1400;

// pdf.js ships ES modules only; a real dynamic import keeps the CommonJS
// build loading it (nodenext emits `import()` as is).
const loadPdfJs = () => import('pdfjs-dist/legacy/build/pdf.mjs');

// The 14 standard fonts a PDF may name without embedding them.
const standardFontDataUrl = (() => {
  try {
    const resolve = createRequire(join(process.cwd(), 'package.json')).resolve;
    return join(resolve('pdfjs-dist/package.json'), '..', 'standard_fonts/');
  } catch {
    return undefined;
  }
})();

export const renderPdfPage = async (
  bytes: Buffer,
  pageNumber: number,
): Promise<PdfPageImage> => {
  const pdfjs = await loadPdfJs();
  const loading = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl,
    verbosity: 0,
  });
  try {
    const document = await loading.promise;
    const pageCount = document.numPages;
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new PdfPageNotFoundError(pageCount);
    }
    const page = await document.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidth / unscaled.width });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvas = createCanvas(width, height);
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
      // An invoice is paper: white under transparent content.
      background: '#FFFFFF',
    }).promise;
    return { png: canvas.toBuffer('image/png'), pageCount };
  } finally {
    await loading.destroy();
  }
};

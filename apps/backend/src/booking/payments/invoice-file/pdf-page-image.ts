import { createCanvas } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// FIX-051 (verification n.º 45, design follow-up 256 § 3, ADR-0110): the
// apps show a PDF invoice as images of its pages, drawn here with Mozilla's
// pdf.js on @napi-rs/canvas, so neither app needs a native PDF viewer and the
// change ships over the air. Only staff upload invoices; pdf.js 6 has no
// script or eval path, the drawing is bounded to 1400 × 4000 and big images
// are refused, and `pdf-page-cache.ts` draws one page at a time.

export type PdfPageImage = { png: Buffer; pageCount: number };

export class PdfPageNotFoundError extends Error {
  constructor(readonly pageCount: number) {
    super('PDF page not found');
  }
}

/** A document pdf.js cannot open, or a page with no size. */
export class PdfPageUnreadableError extends Error {
  constructor() {
    super('PDF page unreadable');
  }
}

/** Wide enough to read when pinched on a tablet, small enough to send. */
const targetWidth = 1400;
/** A strip of a page stays a sane canvas (review of FIX-051). */
const maxHeight = 4000;
/** Embedded images above this many pixels are skipped, not decoded. */
const maxImageSize = 4096 * 4096;

// pdf.js ships ES modules only; a real dynamic import keeps the CommonJS
// build loading it (nodenext emits `import()` as is).
const loadPdfJs = () => import('pdfjs-dist/legacy/build/pdf.mjs');

// The 14 standard fonts a PDF may name without embedding them.
const standardFontDataUrl = (() => {
  const bases = [
    typeof __filename === 'string' ? __filename : undefined,
    join(process.cwd(), 'package.json'),
  ];
  for (const base of bases) {
    if (base === undefined) continue;
    try {
      const resolved = createRequire(base).resolve('pdfjs-dist/package.json');
      return join(resolved, '..', 'standard_fonts/');
    } catch {
      // try the next base
    }
  }
  return undefined;
})();

export const renderPdfPage = async (
  bytes: Buffer,
  pageNumber: number,
): Promise<PdfPageImage> => {
  const pdfjs = await loadPdfJs();
  const loading = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    maxImageSize,
    standardFontDataUrl,
    verbosity: 0,
  });
  try {
    const document = await loading.promise.catch(() => {
      throw new PdfPageUnreadableError();
    });
    const pageCount = document.numPages;
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new PdfPageNotFoundError(pageCount);
    }
    const page = await document.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    if (
      !(unscaled.width > 0 && unscaled.height > 0) ||
      !Number.isFinite(unscaled.width * unscaled.height)
    ) {
      throw new PdfPageUnreadableError();
    }
    const scale = Math.min(
      targetWidth / unscaled.width,
      maxHeight / unscaled.height,
    );
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.floor(viewport.width));
    const height = Math.max(1, Math.floor(viewport.height));
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

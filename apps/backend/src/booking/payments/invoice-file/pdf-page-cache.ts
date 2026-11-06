import type { PdfPageImage } from './pdf-page-image';

/**
 * Review of FIX-051 (ADR-0110): drawing a PDF page runs on the API's own
 * thread, so pages are drawn one at a time, and the last pages drawn are
 * kept in memory, so the viewer's pages and its retries do not read and draw
 * the document again. A failure is never kept.
 */
export const createPdfPageRenderer = ({
  readObject,
  draw,
  maxEntries = 24,
}: {
  readObject: (objectKey: string) => Promise<Buffer>;
  draw: (bytes: Buffer, page: number) => Promise<PdfPageImage>;
  maxEntries?: number;
}) => {
  const drawn = new Map<string, Promise<PdfPageImage>>();
  let queue: Promise<unknown> = Promise.resolve();

  const oneAtATime = <Result>(work: () => Promise<Result>) => {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  };

  return (objectKey: string, page: number): Promise<PdfPageImage> => {
    const key = `${objectKey}#${page}`;
    const known = drawn.get(key);
    if (known !== undefined) {
      drawn.delete(key);
      drawn.set(key, known);
      return known;
    }
    const image = oneAtATime(async () =>
      draw(await readObject(objectKey), page),
    );
    drawn.set(key, image);
    image.catch(() => drawn.delete(key));
    for (const oldest of [...drawn.keys()].slice(
      0,
      Math.max(0, drawn.size - maxEntries),
    )) {
      drawn.delete(oldest);
    }
    return image;
  };
};

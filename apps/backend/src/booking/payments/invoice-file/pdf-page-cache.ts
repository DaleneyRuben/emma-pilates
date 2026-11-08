import type { PdfPageImage } from './pdf-page-image';

/**
 * Review of FIX-051 (ADR-0110): drawing a PDF page runs on the API's own
 * thread, so pages are drawn one at a time, and the last pages drawn are
 * kept in memory, so the viewer's pages and its retries do not read and draw
 * the document again. A failure is never kept. Entries are dropped by
 * rebuilding the map, so ADR-0086's soft-delete guard keeps flagging only
 * database removals.
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
  let drawn = new Map<string, Promise<PdfPageImage>>();
  const keepOnly = (keep: (key: string) => boolean) => {
    drawn = new Map([...drawn].filter(([key]) => keep(key)));
  };
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
      keepOnly((other) => other !== key);
      drawn.set(key, known);
      return known;
    }
    const image = oneAtATime(async () =>
      draw(await readObject(objectKey), page),
    );
    drawn.set(key, image);
    image.catch(() => {
      if (drawn.get(key) === image) keepOnly((other) => other !== key);
    });
    const excess = drawn.size - maxEntries;
    if (excess > 0) {
      const oldest = new Set([...drawn.keys()].slice(0, excess));
      keepOnly((other) => !oldest.has(other));
    }
    return image;
  };
};

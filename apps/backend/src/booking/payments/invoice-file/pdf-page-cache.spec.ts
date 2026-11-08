import { createPdfPageRenderer } from './pdf-page-cache';

// Review of FIX-051: drawing a page is CPU work on the API's own thread, so
// pages are drawn one at a time and a page already drawn is served again.

const image = (label: string) => ({ png: Buffer.from(label), pageCount: 2 });

describe('createPdfPageRenderer', () => {
  it('reads and draws a page once, then serves it again', async () => {
    const readObject = jest.fn(() => Promise.resolve(Buffer.from('%PDF')));
    const draw = jest.fn(() => Promise.resolve(image('p1')));
    const renderPage = createPdfPageRenderer({ readObject, draw });

    await renderPage('key', 1);
    const again = await renderPage('key', 1);

    expect(again.png.toString()).toBe('p1');
    expect(readObject).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('draws one page at a time', async () => {
    let running = 0;
    let most = 0;
    const draw = jest.fn(async () => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return image('p');
    });
    const renderPage = createPdfPageRenderer({
      readObject: () => Promise.resolve(Buffer.from('%PDF')),
      draw,
    });

    await Promise.all([1, 2, 3].map((page) => renderPage('key', page)));

    expect(draw).toHaveBeenCalledTimes(3);
    expect(most).toBe(1);
  });

  it('keeps only the latest pages and forgets a failure', async () => {
    const draw = jest
      .fn<Promise<ReturnType<typeof image>>, [Buffer, number]>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(image('p'));
    const renderPage = createPdfPageRenderer({
      readObject: () => Promise.resolve(Buffer.from('%PDF')),
      draw,
      maxEntries: 2,
    });

    await expect(renderPage('key', 1)).rejects.toThrow('boom');
    await renderPage('key', 1);
    await renderPage('key', 2);
    await renderPage('key', 3);
    await renderPage('key', 1);

    expect(draw).toHaveBeenCalledTimes(5);
  });
});

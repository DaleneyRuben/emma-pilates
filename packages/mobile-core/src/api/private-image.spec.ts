import { loadPrivateImage, loadPrivateImageWithRatio } from "./private-image";

const pngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("loadPrivateImage", () => {
  it("fetches an authenticated image through the API fetcher and returns it as a data URI", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 }),
      );

    await expect(
      loadPrivateImage(fetcher, "/api/v1/clients/current/photo?variant=display"),
    ).resolves.toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(fetcher).toHaveBeenCalledWith("/api/v1/clients/current/photo?variant=display");
  });

  it("assumes JPEG when the response names no content type", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(pngBytes, { status: 200 }));

    await expect(loadPrivateImage(fetcher, "/api/v1/x")).resolves.toMatch(
      /^data:image\/jpeg;base64,/,
    );
  });

  it("returns null when the image is missing or the request fails", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, { status: 404 }));

    await expect(loadPrivateImage(fetcher, "/api/v1/x")).resolves.toBeNull();
  });
});

// A PNG signature followed by an IHDR chunk for the given size.
function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("loadPrivateImageWithRatio", () => {
  it("reads the image's own aspect ratio from its header", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(pngHeader(420, 600), {
        headers: { "Content-Type": "image/png" },
        status: 200,
      }),
    );

    await expect(loadPrivateImageWithRatio(fetcher, "/receipt")).resolves.toMatchObject({
      aspectRatio: 420 / 600,
    });
  });

  it("answers a square when the bytes declare no size", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response(pngBytes, { headers: { "Content-Type": "image/png" } }));

    await expect(loadPrivateImageWithRatio(fetcher, "/receipt")).resolves.toMatchObject({
      aspectRatio: 1,
    });
  });
});

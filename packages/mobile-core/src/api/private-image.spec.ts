import { loadPrivateImage } from "./private-image";

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

describe("loadPrivateImage", () => {
  it("fetches an authenticated image through the API fetcher and returns it as a data URI", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 }),
    );

    await expect(
      loadPrivateImage(fetcher, "/api/v1/clients/current/photo?variant=display"),
    ).resolves.toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/clients/current/photo?variant=display",
    );
  });

  it("assumes JPEG when the response names no content type", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response(pngBytes, { status: 200 }));

    await expect(loadPrivateImage(fetcher, "/api/v1/x")).resolves.toMatch(
      /^data:image\/jpeg;base64,/,
    );
  });

  it("returns null when the image is missing or the request fails", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(loadPrivateImage(fetcher, "/api/v1/x")).resolves.toBeNull();
  });
});

import type { ClientProfileDto } from "@pilates/api-contracts";
import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, profile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const photoDataUri = `data:image/png;base64,${encodeBase64(pngBytes)}`;
const withPhoto: ClientProfileDto = { ...profile, photo: { imageAssetId: "asset-1" } };
const photoRoutes = {
  "/api/v1/clients/current": () => jsonResponse(withPhoto),
  "/api/v1/clients/current/photo?variant=display": () =>
    new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 }),
};

const pickedPhoto = () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///me.png", mimeType: "image/png", width: 10, height: 10 }],
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///me.jpg", width: 10, height: 10 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(pngBytes));
};

const uploadRoutes = (calls: string[]) => ({
  "POST /api/v1/uploads": (init?: RequestInit) => {
    calls.push(`upload ${JSON.parse(String(init?.body)).purpose}`);
    return jsonResponse(
      {
        id: "asset-1",
        uploadUrl: "/api/v1/uploads/asset-1/object",
        expiresAt: "2026-09-24T15:15:00.000Z",
      },
      201,
    );
  },
  "PUT /api/v1/uploads/asset-1/object": () => {
    calls.push("put");
    return new Response(null, { status: 204 });
  },
  "POST /api/v1/uploads/asset-1/finalize": () => {
    calls.push("finalize");
    return jsonResponse({ id: "asset-1", state: "processing" }, 202);
  },
  "/api/v1/uploads/asset-1": () =>
    jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/png" }),
});

describe("Client profile photo", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the photo inside the Perfil avatar instead of the initials", async () => {
    const screen = await openProfile(
      createClientRuntime(routeFetcher({ ...readRoutes, ...photoRoutes })),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", {
        uri: photoDataUri,
      });
    });
    expect(screen.queryByText("SG")).not.toBeOnTheScreen();
  });

  it("picks, uploads, and attaches a new photo from Editar perfil", async () => {
    pickedPhoto();
    const calls: string[] = [];
    let current: ClientProfileDto = profile;
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          ...uploadRoutes(calls),
          "/api/v1/clients/current": () => jsonResponse(current),
          "PUT /api/v1/clients/current/photo": (init) => {
            calls.push(`set ${JSON.parse(String(init?.body)).imageAssetId}`);
            current = withPhoto;
            return jsonResponse(withPhoto);
          },
          "/api/v1/clients/current/photo?variant=display":
            photoRoutes["/api/v1/clients/current/photo?variant=display"],
        }),
      ),
    );
    expect(screen.getByText("SG")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Quitar foto" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(
      () => {
        expect(calls).toEqual(["upload profile_photo", "put", "finalize", "set asset-1"]);
      },
      { timeout: 10_000 },
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", {
        uri: photoDataUri,
      });
    });
    // Finding n.º 21 (follow-up 247): the crop caption is gone.
    expect(screen.queryByText("Se recorta al centro en forma de círculo.")).toBeNull();
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText("Volver"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Editar" })).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", {
      uri: photoDataUri,
    });
  });

  it("removes the photo and falls back to the initials", async () => {
    let removed = false;
    let current: ClientProfileDto = withPhoto;
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          ...photoRoutes,
          "/api/v1/clients/current": () => jsonResponse(current),
          "DELETE /api/v1/clients/current/photo": () => {
            removed = true;
            current = { ...withPhoto, photo: null };
            return new Response(null, { status: 204 });
          },
        }),
      ),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Quitar foto" }));

    await waitFor(() => {
      expect(removed).toBe(true);
      expect(screen.getByText("SG")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("Foto de perfil")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Quitar foto" })).not.toBeOnTheScreen();
  });

  // Walkthrough n.º 14: a profile photo shows in a small circle, so it travels
  // at 1024 px, a quarter of a receipt's pixels, instead of 2048.
  it("sends a large profile photo at 1024 px", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///me.heic", width: 4032, height: 3024 }],
    } as never);
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///me.jpg", width: 1024, height: 768 });
    const calls: string[] = [];
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          ...uploadRoutes(calls),
          "/api/v1/clients/current": () => jsonResponse(profile),
          "PUT /api/v1/clients/current/photo": () => jsonResponse(withPhoto),
          "/api/v1/clients/current/photo?variant=display":
            photoRoutes["/api/v1/clients/current/photo?variant=display"],
        }),
      ),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar foto" }));

    await waitFor(() => expect(calls).toContain("finalize"), { timeout: 10_000 });
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///me.heic",
      [{ resize: { width: 1024 } }],
      expect.objectContaining({ format: "jpeg" }),
    );
  });

  // Walkthrough n.º 14 (C22d): only a failure speaks, and «Reintentar» sends
  // the same photo again; the circle keeps showing it meanwhile.
  it("keeps the new photo after a failed upload and retries it", async () => {
    pickedPhoto();
    let attempts = 0;
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          ...uploadRoutes([]),
          "PUT /api/v1/clients/current/photo": () => {
            attempts += 1;
            return attempts === 1
              ? jsonResponse({ code: "profile_photo_not_ready", status: 409 }, 409)
              : jsonResponse(withPhoto);
          },
          "/api/v1/clients/current/photo?variant=display":
            photoRoutes["/api/v1/clients/current/photo?variant=display"],
        }),
      ),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar foto" }));

    expect(
      await screen.findByText(
        "No pudimos subir tu foto. Tus otros cambios sí se guardaron.",
        {},
        { timeout: 10_000 },
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", { uri: "file:///me.jpg" });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    // C22d: a first photo that did not upload can still be taken away.
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeEnabled();
    const picks = jest.mocked(ImagePicker.launchImageLibraryAsync).mock.calls.length;

    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(attempts).toBe(2), { timeout: 10_000 });
    await waitFor(() =>
      expect(screen.queryByText(/No pudimos subir tu foto/)).not.toBeOnTheScreen(),
    );
    // The same photo goes again: the picker does not open.
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(picks);
  });

  // C22c: the new photo shows at once with a ring while it uploads; the
  // links and «Guardar cambios» never wait for it.
  it("shows the new photo at once with its ring and never blocks saving", async () => {
    pickedPhoto();
    let finishPut: () => void = () => undefined;
    const putDone = new Promise<void>((resolve) => {
      finishPut = resolve;
    });
    const routes = routeFetcher({
      ...readRoutes,
      ...uploadRoutes([]),
      "PUT /api/v1/clients/current/photo": () => jsonResponse(withPhoto),
    });
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT" && String(input).endsWith("/object")) await putDone;
      return routes(input, init);
    }) as ReturnType<typeof routeFetcher>;
    const screen = await openProfile(createClientRuntime(fetcher));

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar foto" }));

    expect(await screen.findByTestId("photo-upload-ring")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", { uri: "file:///me.jpg" });
    expect(screen.queryByText("Subiendo foto…")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    // C22c: «Quitar foto» shows beside «Cambiar foto» for a first photo too.
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();
    finishPut();
    await waitFor(() => expect(screen.queryByTestId("photo-upload-ring")).toBeNull());
  });

  // C22d: «Quitar foto» on a first photo that failed drops it, nothing to delete.
  it("drops a first photo that failed to upload on «Quitar foto»", async () => {
    pickedPhoto();
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          ...uploadRoutes([]),
          "PUT /api/v1/clients/current/photo": () =>
            jsonResponse({ code: "profile_photo_not_ready", status: 409 }, 409),
        }),
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar foto" }));
    await screen.findByText(/No pudimos subir tu foto/, {}, { timeout: 10_000 });

    await fireEvent.press(screen.getByRole("button", { name: "Quitar foto" }));

    expect(screen.getByText("SG")).toBeOnTheScreen();
    expect(screen.queryByText(/No pudimos subir tu foto/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Quitar foto" })).toBeNull();
  });

  // Testing session, Android API 36: the system picker hands back a
  // `content://` uri and the photo is prepared for seconds before it uploads.
  // The circle shows that uri under the ring at once, and keeps the chosen
  // photo until the stored one has loaded, never the initials in between.
  it("draws the picker's content uri under the ring at once, then keeps it", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "content://media/picker/0/42", width: 10, height: 10 }],
    } as never);
    let finishPreparing: () => void = () => undefined;
    jest.mocked(ImageManipulator.manipulateAsync).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPreparing = () => resolve({ uri: "file:///me.jpg", width: 10, height: 10 });
        }),
    );
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(pngBytes));
    let current: ClientProfileDto = profile;
    const routes = routeFetcher({
      ...readRoutes,
      ...uploadRoutes([]),
      "/api/v1/clients/current": () => jsonResponse(current),
      "PUT /api/v1/clients/current/photo": () => {
        current = withPhoto;
        return jsonResponse(withPhoto);
      },
    });
    // The stored photo has not loaded yet.
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/clients/current/photo?variant=display")) {
        return new Promise<Response>(() => undefined);
      }
      return routes(input, init);
    }) as ReturnType<typeof routeFetcher>;
    const screen = await openProfile(createClientRuntime(fetcher));
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar foto" }));

    expect(await screen.findByTestId("photo-upload-ring")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", {
      uri: "content://media/picker/0/42",
    });

    finishPreparing();
    await waitFor(() => expect(screen.queryByTestId("photo-upload-ring")).toBeNull(), {
      timeout: 10_000,
    });
    expect(screen.queryByText("SG")).toBeNull();
    expect(screen.getByLabelText("Foto de perfil")).toHaveProp("source", { uri: "file:///me.jpg" });
  });
});

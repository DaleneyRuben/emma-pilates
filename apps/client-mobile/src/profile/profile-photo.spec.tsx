import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, profile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const photoDataUri = `data:image/png;base64,${encodeBase64(pngBytes)}`;
const withPhoto = { ...profile, photo: { imageAssetId: "asset-1" } };
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
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(pngBytes));
};

const uploadRoutes = (calls: string[]) => ({
  "POST /api/v1/uploads": (init?: RequestInit) => {
    calls.push(`upload ${JSON.parse(String(init?.body)).purpose}`);
    return jsonResponse(
      { id: "asset-1", uploadUrl: "/api/v1/uploads/asset-1/object", expiresAt: "2026-09-24T15:15:00.000Z" },
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
  afterEach(() => {
    cleanup();
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
    let current: typeof profile = profile;
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
          "/api/v1/clients/current/photo?variant=display": photoRoutes[
            "/api/v1/clients/current/photo?variant=display"
          ],
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
    expect(screen.getByText("Se recorta al centro en forma de círculo.")).toBeOnTheScreen();
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
    let current = withPhoto;
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

  it("reports a failed upload and keeps the initials", async () => {
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
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(
      () => {
        expect(
          screen.getByText("No pudimos subir la foto. Inténtalo de nuevo."),
        ).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    expect(screen.getByText("SG")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
  });
});

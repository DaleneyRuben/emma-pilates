import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// Jest cannot run the dynamic import that keeps the native picker out of
// startup, so the seam hands over the real module.
jest.mock("../uploads/load-image-upload", () => ({
  loadImageUpload: async () => jest.requireActual("../uploads/image-upload"),
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: async () => new Uint8Array(32).buffer,
  randomUUID: () => "idempotency-1",
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(),
}));
jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn(),
}));

type Route = (init?: RequestInit) => Response;

const jpegBytes = new Uint8Array([255, 216, 255, 224]);
const photoDataUri = `data:image/jpeg;base64,${encodeBase64(jpegBytes)}`;
const daniela = {
  id: "staff-1",
  name: "Daniela Ortiz",
  email: "daniela.ortiz@emmapilates.bo",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Achumani" }],
  photo: null as { imageAssetId: string } | null,
};
const withPhoto = { ...daniela, photo: { imageAssetId: "asset-old" } };
const photoBytes = () =>
  new Response(jpegBytes, { headers: { "Content-Type": "image/jpeg" }, status: 200 });

function routes(profile: typeof daniela, extra: Record<string, Route> = {}) {
  return {
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/staff-photos/asset-old?variant=display": photoBytes,
    "/api/v1/staff-photos/asset-new?variant=display": photoBytes,
    ...extra,
  };
}

const uploadRoutes = (calls: string[]): Record<string, Route> => ({
  "POST /api/v1/uploads": (init) => {
    calls.push(`upload ${JSON.parse(String(init?.body)).purpose}`);
    return jsonResponse(
      {
        id: "asset-new",
        uploadUrl: "/api/v1/uploads/asset-new/object",
        expiresAt: "2026-11-05T15:15:00.000Z",
      },
      201,
    );
  },
  "PUT /api/v1/uploads/asset-new/object": () => {
    calls.push("put");
    return new Response(null, { status: 204 });
  },
  "POST /api/v1/uploads/asset-new/finalize": () => {
    calls.push("finalize");
    return jsonResponse({ id: "asset-new", state: "processing" }, 202);
  },
  "/api/v1/uploads/asset-new": () =>
    jsonResponse({ id: "asset-new", state: "ready", mediaType: "image/jpeg" }),
});

function pickedPhoto() {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///me.heic", width: 4032, height: 3024 }],
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///me.jpg", width: 2048, height: 1536 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(jpegBytes));
}

async function openProfile(fetcher: typeof globalThis.fetch, role: "trainer" | "administrator") {
  const screen = await render(<App runtime={createStaffRuntime(fetcher, role)} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => expect(screen.getByText("Daniela Ortiz")).toBeOnTheScreen());
  return screen;
}

// FIX-041 (follow-ups 240–242, 247): proposal A on S23 Perfil, every role.
describe("Staff Perfil photo", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.clearAllMocks();
  });

  it("shows her initials with «Cambiar foto» alone and the narrowed note", async () => {
    const screen = await openProfile(routeFetcher(routes(daniela)), "trainer");

    expect(screen.getByText("DO")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toHaveStyle({
      backgroundColor: "#F2E4E1",
      height: 40,
    });
    expect(screen.queryByRole("button", { name: "Quitar foto" })).toBeNull();
    expect(
      screen.getByText("Tu nombre y tu correo los actualiza administración."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Tus datos los actualiza administración.")).toBeNull();
    expect(screen.queryByText("Se recorta al centro en forma de círculo.")).toBeNull();
  });

  it("shows her 72 px photo and «Quitar foto» once one is attached", async () => {
    const screen = await openProfile(routeFetcher(routes(withPhoto)), "trainer");

    await waitFor(() =>
      expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveProp("source", {
        uri: photoDataUri,
      }),
    );
    expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveStyle({ width: 72, height: 72 });
    expect(screen.queryByText("DO")).toBeNull();
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();
    expect(screen.queryByText("Se recorta al centro en forma de círculo.")).toBeNull();
  });

  it("keeps the Administrator's own note", async () => {
    const screen = await openProfile(
      routeFetcher(routes({ ...daniela, role: "administrator", branches: [] })),
      "administrator",
    );

    expect(screen.getByText("Tus datos se editan en la web de administración.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
  });

  it("uploads the picked photo as a 2048 px JPEG and attaches it", async () => {
    pickedPhoto();
    const calls: string[] = [];
    let current = daniela;
    const fetcher = routeFetcher(
      routes(daniela, {
        ...uploadRoutes(calls),
        "/api/v1/staff-members/current": () => jsonResponse(current),
        "PUT /api/v1/staff-members/current/photo": (init) => {
          calls.push(`set ${JSON.parse(String(init?.body)).imageAssetId}`);
          current = { ...daniela, photo: { imageAssetId: "asset-new" } };
          return jsonResponse({ staffMemberId: "staff-1", photo: { imageAssetId: "asset-new" } });
        },
      }),
    );
    const screen = await openProfile(fetcher, "trainer");

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(() =>
      expect(calls).toEqual(["upload profile_photo", "put", "finalize", "set asset-new"]),
    );
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///me.heic",
      [{ resize: { width: 2048 } }],
      expect.objectContaining({ format: "jpeg" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveProp("source", {
        uri: photoDataUri,
      }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/v1/staff-photos/asset-new?variant=display");
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();
    expect(screen.queryByText("Subiendo foto…")).toBeNull();
  });

  it("keeps the chosen photo until the stored one loads, then refreshes the other lists (review)", async () => {
    pickedPhoto();
    const calls: string[] = [];
    let sessionsReads = 0;
    const fetcher = routeFetcher(
      routes(daniela, {
        ...uploadRoutes(calls),
        "/api/v1/trainer/sessions": () => {
          sessionsReads += 1;
          return jsonResponse([]);
        },
        "/api/v1/staff-photos/asset-new?variant=display": () =>
          new Promise<Response>(() => {}) as unknown as Response,
        "PUT /api/v1/staff-members/current/photo": () =>
          jsonResponse({ staffMemberId: "staff-1", photo: { imageAssetId: "asset-new" } }),
      }),
    );
    const screen = await openProfile(fetcher, "trainer");
    const readsBefore = sessionsReads;

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveProp("source", {
      uri: "file:///me.jpg",
    });
    expect(screen.queryByText("DO")).toBeNull();
    await waitFor(() => expect(sessionsReads).toBeGreaterThan(readsBefore));
  });

  it("shows the chosen photo under the veil while it uploads", async () => {
    pickedPhoto();
    const screen = await openProfile(
      routeFetcher(
        routes(daniela, { "POST /api/v1/uploads": () => new Promise(() => {}) as never }),
      ),
      "trainer",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(() => expect(screen.getByText("Subiendo foto…")).toBeOnTheScreen());
    expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveProp("source", {
      uri: "file:///me.jpg",
    });
    expect(screen.getByTestId("photo-veil")).toHaveStyle({
      backgroundColor: "rgba(250, 247, 242, 0.55)",
    });
    expect(screen.queryByRole("button", { name: "Cambiar foto" })).toBeNull();
  });

  it("brings the initials back with the warning when the upload fails", async () => {
    pickedPhoto();
    const screen = await openProfile(
      routeFetcher(
        routes(daniela, {
          ...uploadRoutes([]),
          "PUT /api/v1/staff-members/current/photo": () =>
            jsonResponse({ code: "profile_photo_not_ready", status: 409 }, 409),
        }),
      ),
      "trainer",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar foto" }));

    await waitFor(() =>
      expect(screen.getByText("No pudimos subir la foto. Inténtalo de nuevo.")).toBeOnTheScreen(),
    );
    expect(screen.getByTestId("notice-row-disc")).toHaveStyle({ backgroundColor: "#F7E5E0" });
    expect(screen.getByText("DO")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
  });

  it("removes the photo and falls back to the initials", async () => {
    let removed = false;
    const screen = await openProfile(
      routeFetcher(
        routes(withPhoto, {
          "/api/v1/staff-members/current": () =>
            jsonResponse(removed ? { ...withPhoto, photo: null } : withPhoto),
          "DELETE /api/v1/staff-members/current/photo": () => {
            removed = true;
            return new Response(null, { status: 204 });
          },
        }),
      ),
      "trainer",
    );
    await waitFor(() => expect(screen.getByLabelText("Foto de Daniela Ortiz")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Quitar foto" }));

    await waitFor(() => expect(removed).toBe(true));
    await waitFor(() => expect(screen.getByText("DO")).toBeOnTheScreen());
    expect(screen.queryByLabelText("Foto de Daniela Ortiz")).toBeNull();
    expect(screen.queryByRole("button", { name: "Quitar foto" })).toBeNull();
    expect(screen.queryByText("Quitando foto…")).toBeNull();
  });

  it("puts the photo back with the warning when the removal fails", async () => {
    const screen = await openProfile(
      routeFetcher(
        routes(withPhoto, {
          "DELETE /api/v1/staff-members/current/photo": () =>
            jsonResponse({ code: "internal", status: 500 }, 500),
        }),
      ),
      "trainer",
    );
    await waitFor(() => expect(screen.getByLabelText("Foto de Daniela Ortiz")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Quitar foto" }));

    await waitFor(() =>
      expect(screen.getByText("No pudimos quitar la foto. Inténtalo de nuevo.")).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText("Foto de Daniela Ortiz")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeOnTheScreen();
  });
});

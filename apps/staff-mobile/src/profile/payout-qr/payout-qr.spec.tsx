import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { formatListDate } from "@pilates/api-contracts";
import { boliviaCivilDate, clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import App from "../../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../../test-support";

jest.setTimeout(20_000);

jest.mock("../../uploads/load-image-upload", () => ({
  loadImageUpload: async () => jest.requireActual("../../uploads/image-upload"),
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
const imageUrl = "/api/v1/staff-members/current/payout-qr/qr-1/image";
const daniela = {
  id: "staff-1",
  name: "Daniela Ortiz",
  email: "daniela.ortiz@emmapilates.bo",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Achumani" }],
  photo: null,
};
const qrBytes = () =>
  new Response(jpegBytes, { headers: { "Content-Type": "image/jpeg" }, status: 200 });

function routes(qr: unknown, extra: Record<string, Route> = {}) {
  return {
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(daniela),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/staff-members/current/payout-qr": () => jsonResponse({ payoutQr: qr }),
    [`${imageUrl}?variant=readable`]: qrBytes,
    [`${imageUrl}?variant=thumbnail`]: qrBytes,
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
        expiresAt: "2026-11-18T15:15:00.000Z",
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

function pickedQr() {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///qr.png", width: 1080, height: 1080 }],
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///qr.jpg", width: 1080, height: 1080 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(jpegBytes));
}

const nextMonth = () => {
  const today = boliviaCivilDate(new Date());
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

async function openProfile(fetcher: typeof globalThis.fetch) {
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "trainer")} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => expect(screen.getByText("Daniela Ortiz")).toBeOnTheScreen());
  return screen;
}

// FIX-072, follow-up 276: Perfil › «Tu QR de cobro» (option A; follow-up 293 names it).
describe("Mi QR de cobro", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.clearAllMocks();
  });

  it("names the QR's standing in Perfil and shows it whole with its warning", async () => {
    const screen = await openProfile(
      routeFetcher(
        routes({ id: "qr-1", validUntil: "2026-12-05", standing: "expiring", imageUrl }),
      ),
    );

    const row = await screen.findByRole("button", { name: "Tu QR de cobro, Vence el sáb 5 dic" });
    await fireEvent.press(row);

    expect(
      await screen.findByText(
        "Tu QR vence el sáb 5 dic. Sube uno nuevo antes para que no se atrase tu pago.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Vence el sáb 5 dic · sube uno nuevo")).toBeOnTheScreen();
    expect(await screen.findByLabelText("Tu QR de cobro")).toBeOnTheScreen();
    expect(screen.getByTestId("payout-qr-change")).toBeOnTheScreen();
    expect(screen.queryByText("Todavía no subiste tu QR de cobro")).toBeNull();
  });

  it("says when the QR has expired", async () => {
    const screen = await openProfile(
      routeFetcher(routes({ id: "qr-1", validUntil: "2026-11-15", standing: "expired", imageUrl })),
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Tu QR de cobro, Vencido" }));

    expect(
      await screen.findByText(
        "Tu QR venció el dom 15 nov. Administración no puede usarlo para pagarte: sube uno nuevo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Venció el dom 15 nov · sube uno nuevo")).toBeOnTheScreen();
  });

  it("uploads her first QR with its last valid day", async () => {
    pickedQr();
    const calls: string[] = [];
    const month = nextMonth();
    const day = `${month}-15`;
    const year = month.slice(0, 4);
    const thisYear = year === String(new Date().getFullYear());
    const shown = `${formatListDate(day)}${thisYear ? "" : ` ${year}`}`;
    let current: unknown = null;
    const fetcher = routeFetcher(
      routes(null, {
        ...uploadRoutes(calls),
        "/api/v1/staff-members/current/payout-qr": () => jsonResponse({ payoutQr: current }),
        "PUT /api/v1/staff-members/current/payout-qr": (init) => {
          const body = JSON.parse(String(init?.body));
          calls.push(`set ${body.imageAssetId} ${body.validUntil}`);
          current = { id: "qr-1", validUntil: day, standing: "valid", imageUrl };
          return jsonResponse({ payoutQr: current });
        },
      }),
    );
    const screen = await openProfile(fetcher);

    await fireEvent.press(await screen.findByRole("button", { name: "Tu QR de cobro, Sin subir" }));
    expect(await screen.findByText("Todavía no subiste tu QR de cobro")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("payout-qr-upload"));
    expect(await screen.findByText("Sube tu QR de cobro")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Elegir de la galería" }));

    expect(await screen.findByText("¿Hasta cuándo vale?")).toBeOnTheScreen();
    expect(screen.getByText("Lo dice tu banco al generar el QR.")).toBeOnTheScreen();
    const today = boliviaCivilDate(new Date());
    expect(screen.getByTestId(`calendar-day-${today}`)).toHaveProp(
      "accessibilityLabel",
      expect.stringContaining("no disponible"),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
    await fireEvent.press(screen.getByTestId(`calendar-day-${day}`));
    expect(
      screen.getByText(`Vale hasta el ${shown}. Te avisaremos 7 días antes y cuando venza.`),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("payout-qr-save"));

    await waitFor(() =>
      expect(calls).toEqual(["upload payout_qr", "put", "finalize", `set asset-new ${day}`]),
    );
    expect(await screen.findByText(`Guardamos tu QR. Vale hasta el ${shown}.`)).toBeOnTheScreen();
    expect(await screen.findByTestId("payout-qr-change")).toBeOnTheScreen();

    // Review finding: a new photo asks for its own day, never the last one.
    pickedQr();
    await fireEvent.press(screen.getByTestId("payout-qr-change"));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir de la galería" }));
    expect(await screen.findByText("¿Hasta cuándo vale?")).toBeOnTheScreen();
    expect(screen.queryByText(/Te avisaremos 7 días antes/)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("payout-qr-save"));
    expect(await screen.findByText("Elige el último día que vale tu QR.")).toBeOnTheScreen();
  });

  it("says when saving failed", async () => {
    pickedQr();
    const month = nextMonth();
    const screen = await openProfile(
      routeFetcher(
        routes(null, {
          ...uploadRoutes([]),
          "PUT /api/v1/staff-members/current/payout-qr": () =>
            jsonResponse({ code: "payout_qr_not_ready" }, 409),
        }),
      ),
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Tu QR de cobro, Sin subir" }));
    await fireEvent.press(await screen.findByTestId("payout-qr-upload"));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir de la galería" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Mes siguiente" }));
    await fireEvent.press(screen.getByTestId(`calendar-day-${month}-15`));
    await fireEvent.press(screen.getByTestId("payout-qr-save"));

    expect(
      await screen.findByText("No pudimos guardar tu QR. Inténtalo de nuevo."),
    ).toBeOnTheScreen();
  });
});

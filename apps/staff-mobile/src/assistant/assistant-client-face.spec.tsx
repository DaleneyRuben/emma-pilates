import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher, jsonResponse } from "../test-support";
import {
  assistantRoutes,
  lucia,
  openClientSearch,
  openLucia,
  overview,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const luciaPhoto = { imageAssetId: "asset-lucia" };
const image = () =>
  new Response(new Uint8Array([255, 216, 255, 224]), {
    headers: { "Content-Type": "image/jpeg" },
    status: 200,
  });
const withPhoto = (fetched: string[]) => {
  const record = (path: string) => (): Response => {
    fetched.push(path);
    return image();
  };
  return {
    ...assistantRoutes(),
    "/api/v1/assistant/clients?query=luc": () =>
      jsonResponse([
        { ...lucia, photo: luciaPhoto },
        { ...lucia, id: "client-luisa", name: "Luisa Flores", photo: null },
      ]),
    "/api/v1/assistant/clients/client-lucia": () =>
      jsonResponse({ ...overview, client: { ...lucia, photo: luciaPhoto } }),
    "/api/v1/client-photos/asset-lucia?variant=thumbnail": record("thumbnail"),
    "/api/v1/client-photos/asset-lucia?variant=display": record("display"),
  } satisfies Parameters<typeof routeFetcher>[0];
};

// Finding n.º 30 (owner, 2026-11-05): the Client's face wherever the
// Assistant or the Coordinator sees her.
describe("The Client's face on the Assistant's screens", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("leads each Buscar cliente result with her photo, or her initials", async () => {
    const fetched: string[] = [];
    const screen = await openClientSearch(withPhoto(fetched));
    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");

    const row = await screen.findByTestId("client-result-client-lucia");
    await waitFor(() =>
      expect(within(row).getByLabelText("Foto de Lucía Fernández")).toHaveStyle({ width: 36 }),
    );
    expect(fetched).toContain("thumbnail");
    expect(
      within(screen.getByTestId("client-result-client-luisa")).getByText("LF"),
    ).toBeOnTheScreen();
  });

  it("shows her 56 px photo on her file and her face on the booking banner", async () => {
    const fetched: string[] = [];
    const screen = await openLucia(withPhoto(fetched));

    await waitFor(() =>
      expect(screen.getAllByLabelText("Foto de Lucía Fernández").at(-1)).toHaveStyle({
        width: 56,
        height: 56,
      }),
    );
    expect(fetched).toContain("display");

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    const banner = await screen.findByTestId("client-banner");
    await waitFor(() =>
      expect(within(banner).getByLabelText("Foto de Lucía Fernández")).toHaveStyle({
        width: 32,
      }),
    );
  });

  it("keeps her initials on the banner while she has no photo", async () => {
    const screen = await openLucia(assistantRoutes());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    const banner = await screen.findByTestId("client-banner");
    expect(within(banner).getByText("LF")).toBeOnTheScreen();
    expect(within(banner).queryByLabelText("Foto de Lucía Fernández")).toBeNull();
  });
});

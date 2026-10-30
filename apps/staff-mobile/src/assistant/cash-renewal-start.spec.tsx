import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, overview, subscription } from "./assistant-fixtures";

jest.setTimeout(20_000);

const studioRules = {
  cancellationWindowHours: 2.5,
  openingDate: "2026-01-01",
  startDateLimitDays: 14,
};

const renewalOverview = {
  ...overview,
  subscription: {
    status: "active",
    subscription,
    renewalStartsOn: "2026-10-13",
  },
};

describe("Confirming cash for a renewal", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names the fixed start instead of offering dates while classes remain", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () => jsonResponse(renewalOverview),
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("Confirmar pago en efectivo")).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("start-date-chooser")).toBeNull();
    expect(
      screen.getByText("El nuevo plan empieza el 13 de octubre, al terminar el actual."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Confirma solo cuando tengas el efectivo en mano. El plan queda programado para esa fecha.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/El plan se activa al instante/)).toBeNull();
  });

  it("keeps the dates and the instant activation when nothing is left to renew", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByTestId("start-date-chooser")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Confirma solo cuando tengas el efectivo en mano. El plan se activa al instante.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/El plan queda programado/)).toBeNull();
  });

  it("waits for the Client overview before offering the Plans", async () => {
    let overviewReads = 0;
    let overviewFails = false;
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () => {
        overviewReads += 1;
        return overviewFails
          ? jsonResponse({ code: "service_unavailable" }, 503)
          : jsonResponse(renewalOverview);
      },
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
    });
    const readsOnOverview = overviewReads;
    overviewFails = true;

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));

    expect(await screen.findByText("No pudimos cargar los planes.")).toBeOnTheScreen();
    expect(overviewReads).toBeGreaterThan(readsOnOverview);
    expect(screen.queryByRole("button", { name: /^Paquete de 8 clases,/ })).toBeNull();

    overviewFails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("Confirmar pago en efectivo")).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("start-date-chooser")).toBeNull();
    expect(
      screen.getByText("El nuevo plan empieza el 13 de octubre, al terminar el actual."),
    ).toBeOnTheScreen();
  });
});

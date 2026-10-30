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
    await fireEvent.press(await screen.findByRole("button", { name: "Paquete de 8 clases" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Confirmar pago en efectivo")).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("start-date-chooser")).toBeNull();
    expect(
      screen.getByText("El nuevo plan empieza el 13 de octubre, al terminar el actual."),
    ).toBeOnTheScreen();
  });
});

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

  // booking ADR-0013: the next Plan picks a day from the day after the
  // current end through 28 days after it (design follow-up 254 § 4).
  it("offers the next Plan's days from the day after the current end", async () => {
    const paid = jest.fn();
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () => jsonResponse(renewalOverview),
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": (init) => {
        paid(JSON.parse(String(init?.body)));
        return jsonResponse({ code: "service_unavailable" }, 503);
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByTestId("start-date-2026-10-13")).toHaveProp("accessibilityState", {
        selected: true,
      });
    });
    expect(screen.getByTestId("start-date-2026-11-09")).toBeOnTheScreen();
    expect(screen.queryByTestId("start-date-2026-11-10")).toBeNull();
    expect(screen.queryByText(/al terminar el actual/)).toBeNull();
    await fireEvent.press(screen.getByTestId("start-date-2026-10-20"));
    expect(
      screen.getByText(
        "El plan actual de Lucía vence el 12 de octubre. El nuevo empieza el 20 de octubre; se puede elegir hasta el 9 de noviembre.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Confirma con el efectivo en mano: el plan queda programado para esa fecha.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago en efectivo" }));

    await waitFor(() => {
      expect(paid).toHaveBeenCalledWith(expect.objectContaining({ startsOn: "2026-10-20" }));
    });
  });

  it("keeps the dates and the instant activation when nothing is left to renew", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByTestId("start-date-chooser")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Confirma con el efectivo en mano: el plan se activa al instante."),
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

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByText("No pudimos cargar los planes.")).toBeOnTheScreen();
    expect(overviewReads).toBeGreaterThan(readsOnOverview);
    expect(screen.queryByRole("button", { name: /^Paquete de 8 clases,/ })).toBeNull();

    overviewFails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("Registrar pago")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("start-date-2026-10-13")).toBeOnTheScreen();
  });

  it("explains a start before her booked guest class (FIX-019)", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/studio-rules": () => jsonResponse(studioRules),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": () =>
        jsonResponse({ code: "start_date_before_booked_class" }, 409),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Confirmar pago en efectivo" }),
    );

    expect(
      await screen.findByText(
        "La clienta tiene una clase reservada con su acceso actual. Elige un inicio después de esa clase.",
      ),
    ).toBeOnTheScreen();
  });
});

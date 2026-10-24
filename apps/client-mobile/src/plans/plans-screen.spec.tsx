import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

const profile = {
  id: "client-1",
  name: "Mariana Peña",
  email: "mariana@example.com",
  phone: null,
  referralCode: "REF-MARIANA",
};

const plans = [
  {
    id: "plan-8",
    name: "Paquete de 8 clases",
    durationDays: 30,
    weeklyClassCap: null,
    durationMonths: 1,
    classAllowance: 8,
    priceCentavos: 56_000,
  },
  {
    id: "plan-36",
    name: "Trimestral 36 clases",
    durationDays: 90,
    weeklyClassCap: 4,
    durationMonths: 3,
    classAllowance: 36,
    priceCentavos: 210_000,
  },
];

describe("Client Plans", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists the Plans from Home and opens a Plan detail", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/plans": () => jsonResponse(plans),
      "/api/v1/plans/plan-36": () => jsonResponse(plans[1]),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    await waitFor(() => {
      expect(screen.getByText("Elige tu plan")).toBeOnTheScreen();
      expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    });
    // BKM-005: validity in days, the Weekly Cap only on the Plans that have one.
    expect(screen.getByText("8 clases · válido por 30 días")).toBeOnTheScreen();
    expect(
      screen.getByText("36 clases · válido por 90 días · hasta 4 por semana"),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/\bmes(es)?\b/)).toBeNull();
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Bs 2.100")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Trimestral 36 clases" }));

    // The loading state shares the «Detalle del plan» heading, so wait for the Plan itself.
    await waitFor(() => {
      expect(screen.getByText("Válido por 90 días")).toBeOnTheScreen();
    });
    expect(screen.getByText("90 días de vigencia desde la fecha de inicio.")).toBeOnTheScreen();
    expect(screen.getByText("Hasta 4 clases por semana.")).toBeOnTheScreen();
    expect(screen.queryByText(/\bmes(es)?\b/)).toBeNull();
    // 09's bar names the Plan once it loads (MOB-034).
    expect(
      within(screen.getByTestId("screen-top-bar")).getByLabelText("Trimestral 36 clases"),
    ).toBeOnTheScreen();
    expect(screen.getByText("36 clases en cualquier sucursal del estudio.")).toBeOnTheScreen();
    expect(screen.getByText("Total a pagar")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continuar al pago" })).toBeOnTheScreen();
  });

  it("shows an empty state when no Plan is visible", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/plans": () => jsonResponse([]),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    await waitFor(() => {
      expect(screen.getByText("Por ahora no hay planes disponibles.")).toBeOnTheScreen();
    });
  });
});

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
    // C08: each Plan is a row of one Lino group with its terms on one line.
    expect(screen.getByText("Válido por 30 días")).toBeOnTheScreen();
    // Without a discount there is no launch banner.
    expect(screen.queryByText("Oferta por tiempo limitado · 15 % en tu plan")).toBeNull();
    expect(screen.getByText("90 días · hasta 4 por semana")).toBeOnTheScreen();
    expect(screen.queryByText(/\bmes(es)?\b/)).toBeNull();
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Bs 2.100")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: /^Trimestral 36 clases,/ }));

    // The loading state shares the «Detalle del plan» heading, so wait for the Plan itself.
    await waitFor(() => {
      expect(screen.getByText("Válido por 90 días")).toBeOnTheScreen();
    });
    // C09: «Qué incluye» as icon rows.
    expect(screen.getByText("90 días desde la fecha de inicio")).toBeOnTheScreen();
    expect(screen.getByText("Hasta 4 clases por semana")).toBeOnTheScreen();
    expect(screen.queryByText(/\bmes(es)?\b/)).toBeNull();
    // C09's bar names where it opened from; the hero names the Plan.
    expect(
      within(screen.getByTestId("screen-top-bar")).getByLabelText("Elige tu plan"),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("plan-hero")).getByText("Trimestral 36 clases"),
    ).toBeOnTheScreen();
    expect(screen.getByText("36 clases")).toBeOnTheScreen();
    expect(screen.getByText("Total")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Pagar Bs 2.100" })).toBeOnTheScreen();
    expect(screen.getByText("Pagas por QR y subes tu comprobante")).toBeOnTheScreen();
    expect(screen.queryByText("Descuento 15 %")).toBeNull();
  });

  it("shows a founder the discounted price and the struck list price", async () => {
    const founderPlans = [
      {
        ...plans[0],
        priceCentavos: 47_600,
        listPriceCentavos: 56_000,
      },
      { ...plans[1], classAllowance: 1, priceCentavos: 8_000, weeklyClassCap: null },
    ];
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/plans": () => jsonResponse(founderPlans),
      "/api/v1/plans/plan-8": () => jsonResponse(founderPlans[0]),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    await waitFor(() => {
      expect(screen.getByText("Bs 476")).toBeOnTheScreen();
    });
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Bs 80")).toBeOnTheScreen();
    expect(screen.getAllByText("Bs 560")).toHaveLength(1);
    // Walkthrough n.º 13: the launch banner, never «fundadora».
    expect(screen.getByText("Oferta por tiempo limitado · 15 % en tu plan")).toBeOnTheScreen();
    expect(screen.queryByText(/fundadora/i)).toBeNull();
    expect(screen.getByText("Válida por 90 días")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: /^Paquete de 8 clases,/ }));
    await waitFor(() => {
      expect(screen.getByText("Desglose")).toBeOnTheScreen();
    });
    // Walkthrough n.º 14: the breakdown shows the discount.
    expect(
      within(screen.getByTestId("plan-hero")).getByText("15 % de descuento"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Precio del plan")).toBeOnTheScreen();
    expect(screen.getByText("Descuento 15 %")).toBeOnTheScreen();
    expect(screen.getByText("−Bs 84")).toHaveStyle({ color: "#7D4F4B" });
    expect(screen.getAllByText("Bs 476").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bs 560").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pagar Bs 476" })).toBeOnTheScreen();
  });

  it("reads the price, and the list price when shown, in the plan card label", async () => {
    const founderPlans = [
      { ...plans[0], priceCentavos: 47_600, listPriceCentavos: 56_000 },
      plans[1],
    ];
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/plans": () => jsonResponse(founderPlans),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    expect(
      await screen.findByRole("button", { name: "Paquete de 8 clases, Bs 476, antes Bs 560" }),
    ).not.toHaveProp("accessibilityHint");
    expect(
      screen.getByRole("button", { name: "Trimestral 36 clases, Bs 2.100" }),
    ).toBeOnTheScreen();
  });

  // BKM-019: with 10 or fewer launch places left, the strong line with the count.
  it.each([
    [6, "¡Quedan solo 6 lugares con 15 % de descuento!"],
    [1, "¡Queda solo 1 lugar con 15 % de descuento!"],
  ])("warns when %i launch places are left", async (placesLeft, line) => {
    const founderPlans = [
      {
        ...plans[0],
        priceCentavos: 47_600,
        listPriceCentavos: 56_000,
        launchPlacesLeft: placesLeft,
      },
      plans[1],
    ];
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/plans": () => jsonResponse(founderPlans),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    expect(await screen.findByText(line)).toBeOnTheScreen();
    expect(screen.queryByText("Oferta por tiempo limitado · 15 % en tu plan")).toBeNull();
    expect(screen.queryByText(/fundadora|40/i)).toBeNull();
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

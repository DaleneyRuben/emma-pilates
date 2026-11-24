import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, WideScreens } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import { jsonResponse, routeFetcher } from "../test-support";
import { PaymentStatusView } from "./payment-status-view";
import { baseRoutes, intent, openPlanDetail, plan } from "./purchase-test-support";

jest.setTimeout(30_000);

const otherPlan = {
  ...plan,
  id: "plan-12",
  name: "12 clases",
  classAllowance: 12,
  priceCentavos: 82_000,
};

const fetcher = () =>
  routeFetcher({
    ...baseRoutes(0),
    "/api/v1/plans": () => jsonResponse([plan, otherPlan]),
    "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
  });

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

// Follow-up 289: 08T to 11T, buying a Plan on a tablet.
describe("Buying a Plan on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("lays out Elegir plan, Detalle del plan and Pago in the tablet boards", async () => {
    windowWidth(834);
    const screen = await openPlanDetail(fetcher());

    // 09T: the price and what it includes beside the start and the breakdown.
    const left = screen.getByTestId("tablet-columns-left");
    expect(left).toHaveStyle({ flex: 1 });
    expect(within(left).getByTestId("plan-hero")).toBeOnTheScreen();
    expect(within(left).getByText("Qué incluye")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("tablet-columns-right")).getByText("Desglose"),
    ).toBeOnTheScreen();
    const footer = screen.getByTestId("plan-detail-footer");
    expect(within(footer).getByTestId("tablet-column")).toHaveStyle({ maxWidth: 480 });

    // 08T, back one step: two Plan cards to a row, 14 pt apart.
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("tablet-grid")).toBeOnTheScreen());
    expect(screen.getByTestId("tablet-grid")).toHaveStyle({ gap: 14 });
    expect(screen.getByTestId("plan-card-plan-8")).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId("plan-card-plan-12")).toHaveStyle({ flex: 1 });

    // 10T: the QR beside the receipt, the footer in 480 pt.
    await fireEvent.press(screen.getByRole("button", { name: /^Paquete de 8 clases,/ }));
    await fireEvent.press(await screen.findByTestId("plan-continue-to-payment"));
    await waitFor(() => expect(screen.getByTestId("payment-hero")).toBeOnTheScreen());
    const qr = screen.getByTestId("tablet-columns-left");
    expect(within(qr).getByText("1 · Paga con el QR del estudio")).toBeOnTheScreen();
    const receipt = screen.getByTestId("tablet-columns-right");
    expect(within(receipt).getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    expect(within(receipt).getByTestId("invoice-disclosure")).toBeOnTheScreen();
    expect(within(screen.getByTestId("payment-footer")).getByTestId("tablet-column")).toHaveStyle({
      maxWidth: 480,
    });
  });

  it("keeps the phone's Plan list and single stacks under 768 pt", async () => {
    windowWidth(390);
    const screen = await openPlanDetail(fetcher());

    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    expect(screen.queryByTestId("tablet-column")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("plan-card-plan-12")).toBeOnTheScreen());
    expect(screen.queryByTestId("tablet-grid")).toBeNull();
  });

  it("centres the payment's result in 480 pt (11T)", async () => {
    windowWidth(834);
    const screen = await render(
      <WideScreens>
        <PaymentStatusView
          onHome={jest.fn()}
          payment={{ amountDueCentavos: 56_000, classAllowance: 8, planName: plan.name }}
          state="pending"
        />
      </WideScreens>,
    );

    const columns = screen.getAllByTestId("tablet-column");
    expect(columns).toHaveLength(2);
    for (const column of columns) expect(column).toHaveStyle({ maxWidth: 480 });
    expect(within(columns[0]!).getByTestId("payment-status-facts")).toBeOnTheScreen();
    expect(within(columns[1]!).getByText("Volver al inicio")).toBeOnTheScreen();
  });
});

import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const today = boliviaCivilDate(new Date());

const fetcher = () =>
  routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({
        status: "active",
        subscription: {
          id: "subscription-1",
          planName: "Trimestral 36 clases",
          originalClassAllowance: 36,
          remainingClassAllowance: 30,
          startsOn: addCivilDays(today, -6),
          endsOn: addCivilDays(today, 83),
        },
        nextSubscription: null,
        freeze: null,
        canRequestFreeze: true,
      }),
  });

async function openMiPlan() {
  const screen = await render(<App runtime={createClientRuntime(fetcher())} />);
  await waitFor(() => expect(screen.getByRole("button", { name: /^Mi plan/ })).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Mi plan/ }));
  await waitFor(() => expect(screen.getByTestId("subscription-hero")).toBeOnTheScreen());
  return screen;
}

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

// Follow-up 289: 12T Mi plan and Congelar plan on a tablet.
describe("Mi plan on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("sets the plan and renewing beside the details and «Tu plan» (12T)", async () => {
    windowWidth(834);
    const screen = await openMiPlan();

    const left = screen.getByTestId("tablet-columns-left");
    expect(left).toHaveStyle({ flex: 1 });
    expect(within(left).getByTestId("subscription-hero")).toBeOnTheScreen();
    expect(within(left).getByTestId("subscription-renew")).toBeOnTheScreen();
    const right = screen.getByTestId("tablet-columns-right");
    expect(within(right).getByText("Detalles")).toBeOnTheScreen();
    expect(within(right).getByText("Tu plan")).toBeOnTheScreen();

    // Congelar plan: the form in 560 pt, its footer in 480 pt.
    await fireEvent.press(within(right).getByRole("button", { name: /^Congelar plan/ }));
    await waitFor(() => expect(screen.getByTestId("freeze-footer")).toBeOnTheScreen());
    const [form, footer] = screen.getAllByTestId("tablet-column");
    expect(form).toHaveStyle({ maxWidth: 560 });
    expect(within(form!).getByTestId("freeze-calendar-card")).toBeOnTheScreen();
    expect(footer).toHaveStyle({ maxWidth: 480 });
    expect(within(footer!).getByText("Enviar solicitud")).toBeOnTheScreen();
  });

  it("keeps the phone's single stack under 768 pt", async () => {
    windowWidth(390);
    const screen = await openMiPlan();

    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /^Congelar plan/ }));
    await waitFor(() => expect(screen.getByTestId("freeze-footer")).toBeOnTheScreen());
    expect(screen.queryByTestId("tablet-column")).toBeNull();
  });
});

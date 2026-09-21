import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

const profile = {
  id: "client-1",
  name: "Valeria Quiroga",
  email: "valeria@example.com",
  phone: null,
  referralCode: "REF-VALERIA",
};

const subscription = (status: string, remaining: number) => ({
  status,
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 12 clases",
    originalClassAllowance: 12,
    remainingClassAllowance: remaining,
    startsOn: "2026-08-25",
    endsOn: "2026-09-24",
  },
});

async function openSubscription(view: unknown) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(view),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeOnTheScreen();
  });
  fireEvent.press(screen.getByRole("button", { name: "Ver detalle" }));
  await waitFor(() => {
    expect(screen.getByText("Mi plan")).toBeOnTheScreen();
  });

  return screen;
}

describe("Client Subscription detail", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows the active Plan with allowance and dates", async () => {
    const screen = await openSubscription(subscription("active", 5));

    expect(screen.getByText("Paquete de 12 clases")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(screen.getByText("5 de 12 clases")).toBeOnTheScreen();
    expect(screen.getByText("Te quedan 5 clases por usar")).toBeOnTheScreen();
    expect(screen.getByText("25 de agosto")).toBeOnTheScreen();
    expect(screen.getByText("24 de septiembre")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Comprar un plan" }),
    ).not.toBeOnTheScreen();
  });

  it("warns about the paid-through date when expiring soon", async () => {
    const screen = await openSubscription(subscription("expiring_soon", 2));

    expect(screen.getByText("Por vencer")).toBeOnTheScreen();
    expect(
      screen.getByText("Tu plan vence el 24 de septiembre."),
    ).toBeOnTheScreen();
  });

  it("tells the Client when no classes remain", async () => {
    const screen = await openSubscription(subscription("active", 0));

    expect(screen.getByText("Sin clases disponibles")).toBeOnTheScreen();
  });
});

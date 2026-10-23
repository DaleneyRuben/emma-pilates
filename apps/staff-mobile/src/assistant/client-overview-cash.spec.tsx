import { cleanup, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  farBooking,
  openLucia,
  overview,
  subscription,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

// UX-003: no second Plan while the current one is effective (the API's
// subscription_not_expired: paid through today and still holding classes or
// a future Booking), so S06 says so before the picker instead of S10
// refusing at the last tap (UX-001 finding S3).
const note = "Podrá comprar otro plan cuando este termine.";

describe("Client overview cash action", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("disables «Registrar pago en efectivo» with the note while the Plan is active", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeDisabled();
    expect(screen.getByText(note)).toBeOnTheScreen();
  });

  it("disables it while the Plan is about to expire", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({ ...overview, subscription: { status: "expiring_soon", subscription } }),
    });

    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeDisabled();
    expect(screen.getByText(note)).toBeOnTheScreen();
  });

  it("keeps it enabled while an active Plan has no classes left and no upcoming Booking", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "active",
            subscription: { ...subscription, remainingClassAllowance: 0 },
          },
          nextBooking: null,
        }),
    });

    await waitFor(() => {
      expect(screen.getByText("0 clases restantes")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  it("disables it while an active Plan with no classes left still has an upcoming Booking", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "active",
            subscription: { ...subscription, remainingClassAllowance: 0 },
          },
          nextBooking: farBooking,
        }),
    });

    await waitFor(() => {
      expect(screen.getByText("0 clases restantes")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeDisabled();
    expect(screen.getByText(note)).toBeOnTheScreen();
  });

  it("keeps it enabled without the note once the Plan has expired", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "expired",
            subscription: { ...subscription, remainingClassAllowance: 0, endsOn: "2026-09-12" },
          },
        }),
    });

    await waitFor(() => {
      expect(screen.getByText("Vencida")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });
});

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

// BKM-006: an effective Plan no longer blocks cash. Only a future Plan does.
const note = "Ya tiene un plan siguiente.";

describe("Client overview cash action", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("keeps «Registrar pago en efectivo» enabled while the Plan is active", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  it("keeps it enabled while the Plan is about to expire", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({ ...overview, subscription: { status: "expiring_soon", subscription } }),
    });

    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
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

  it("keeps it enabled while an active Plan with no classes left still has an upcoming Booking", async () => {
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
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  it("disables it when a future Plan is already queued", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "active",
            subscription,
            nextSubscription: { ...subscription, id: "next", startsOn: "2026-10-13" },
          },
        }),
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

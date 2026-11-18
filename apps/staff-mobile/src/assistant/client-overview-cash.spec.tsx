import { cleanup, waitFor, within } from "@testing-library/react-native";
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

// BKM-006: an effective Plan no longer blocks cash. Only a future Plan does,
// and walkthrough finding 117 says which one and until when.
const note =
  "Próximo plan ya pagado: Paquete de 8 clases, desde el 13 de octubre. Podrás registrar otro pago cuando empiece.";

describe("Client overview cash action", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("keeps «Registrar pago» enabled while the Plan is active", async () => {
    const screen = await openLucia(assistantRoutes());

    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  // FIX-083 (Ficha pick A): «Reservar clase» is the one solid button; selling
  // and her records follow as plain rows.
  it("lists Registrar pago among the plain rows under «Reservar clase»", async () => {
    const screen = await openLucia(assistantRoutes());
    const rows = screen.getByTestId("client-overview-rows");

    expect(within(rows).getByRole("button", { name: /^Reservas, / })).toBeOnTheScreen();
    expect(within(rows).getByRole("button", { name: "Historial de clases" })).toBeOnTheScreen();
    expect(within(rows).getByRole("button", { name: "Registrar pago" })).toBeOnTheScreen();
    expect(within(rows).queryByTestId("icon-row-disc")).toBeNull();
  });

  it("keeps it enabled while the Plan is about to expire", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({ ...overview, subscription: { status: "expiring_soon", subscription } }),
    });

    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
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
      expect(screen.getByText("0 de 8 del plan · vence el 12 de octubre")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
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
      expect(screen.getByText("0 de 8 del plan · vence el 12 de octubre")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  // v2 S06: offered only when she can buy, never shown to fail.
  it("hides it when a future Plan is already queued", async () => {
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

    await waitFor(() => expect(screen.getByText(note)).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "Registrar pago" })).toBeNull();
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
      expect(screen.getByText("Vencido")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    expect(screen.queryByText(note)).toBeNull();
  });

  // Review of FIX-083: extra classes alone still book (booking ADR-0013's
  // spendable extras), so the card and the button agree.
  it("offers «Reservar clase» when only extra classes are left", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "active",
            subscription: { ...subscription, remainingClassAllowance: 0, extraClasses: 2 },
          },
        }),
    });

    await waitFor(() => expect(screen.getByText("2 clases disponibles")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeEnabled();
  });

  it("never calls an expired plan's leftover classes available", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "expired",
            subscription: { ...subscription, endsOn: "2026-09-12" },
          },
        }),
    });

    await waitFor(() => expect(screen.getByText("Vencido")).toBeOnTheScreen());
    expect(screen.getByText("clases sin usar")).toBeOnTheScreen();
    expect(screen.queryByText(/disponible/)).toBeNull();
  });
});

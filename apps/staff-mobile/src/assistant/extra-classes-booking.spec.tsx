import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, overview, subscription } from "./assistant-fixtures";

jest.setTimeout(20_000);

// FIX-083 review: extra classes alone book (booking ADR-0013), so the file's
// «Reservar clase» must lead to a Session she can actually be booked into.
describe("Booking with extra classes only", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers «Reservar para» on the class when only extra classes are left", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            status: "active",
            subscription: { ...subscription, remainingClassAllowance: 0, extraClasses: 1 },
          },
        }),
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Reservar clase" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Reformer Pilates \d/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reservar para Lucía" })).toBeEnabled(),
    );
    expect(screen.getByText(/1 clase disponible$/)).toBeOnTheScreen();
    expect(screen.queryByText("La clienta no tiene clases disponibles en su plan")).toBeNull();
  });
});

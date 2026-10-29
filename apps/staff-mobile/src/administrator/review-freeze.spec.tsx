import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const freeze = {
  id: "freeze-1",
  clientName: "Lucía Fernández",
  planName: "Trimestral 36 clases",
  startsOn: "2026-10-27",
  endsOn: "2026-11-03",
  reason: "Viaje de trabajo",
  state: "requested",
};

const profile = {
  id: "staff-1",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

describe("freeze review", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names a freeze that already started", async () => {
    const fetcher = routeFetcher({
      "/api/v1/staff-members/current": () => jsonResponse(profile),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
      "/api/v1/notifications": () =>
        jsonResponse({
          items: [
            {
              id: "n1",
              category: "booking_schedule",
              type: "freeze_requested",
              title: "Congelamiento",
              message: "Lucía pidió un congelamiento.",
              destinationType: "freeze",
              destinationId: freeze.id,
              createdAt: "2026-10-29T15:00:00.000Z",
              readAt: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        }),
      [`/api/v1/administrator/freezes/${freeze.id}`]: () => jsonResponse(freeze),
      [`POST /api/v1/administrator/freezes/${freeze.id}/decision`]: () =>
        jsonResponse(
          {
            code: "freeze_start_in_past",
            detail: "The freeze already started",
          },
          409,
        ),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
    await fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
    await waitFor(() =>
      expect(screen.getByText("Lucía pidió un congelamiento.")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByText("Lucía pidió un congelamiento."));
    await waitFor(() => expect(screen.getByText("Lucía Fernández")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() =>
      expect(
        screen.getByText("El congelamiento ya empezó. Recházalo. Este plan no se congela."),
      ).toBeOnTheScreen(),
    );
  });
});

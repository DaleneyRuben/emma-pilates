import { act, cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const notificationId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";

function administratorFetcher() {
  return routeFetcher({
    "/api/v1/staff-members/current": () =>
      jsonResponse({
        id: "staff-1",
        name: "Paola Mendoza",
        email: "paola.mendoza@example.com",
        phone: null,
        role: "administrator",
        branches: [],
      }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    [`POST /api/v1/notifications/${notificationId}/read`]: () =>
      new Response(null, { status: 204 }),
    "PUT /api/v1/notifications/devices/current": () => new Response(null, { status: 204 }),
  });
}

async function renderAdministrator(device = createMemoryPushPlatform()) {
  const fetcher = administratorFetcher();
  const screen = await render(
    <App
      runtime={createStaffRuntime(fetcher, "administrator", {
        installationIdentifier: () => Promise.resolve("installation-1"),
        pushPlatform: device.platform,
      })}
    />,
  );
  await waitFor(
    () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  return { device, fetcher, screen };
}

describe("Staff push notifications (NOT-002)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("registers this installation and keeps the badge on the unread count", async () => {
    const { device, fetcher } = await renderAdministrator();

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/notifications/devices/current",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    await waitFor(() => expect(device.state.badgeCounts.at(-1)).toBe(2));
  });

  it("opens the submitted payment from a tapped push", async () => {
    const { device, screen } = await renderAdministrator();

    await act(async () =>
      device.tap({
        notificationId,
        type: "payment_submitted",
        destinationType: "payment",
        destinationId: paymentId,
      }),
    );

    await waitFor(() => expect(screen.getByText("Revisar pago")).toBeOnTheScreen());
  });

  // ADR-0067: Staff see the explanation when their role's home first loads.
  it("offers notifications once the role's home loads", async () => {
    const { screen } = await renderAdministrator(createMemoryPushPlatform("undetermined"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar notificaciones" })).toBeOnTheScreen(),
    );
  });

  it("offers nothing to Staff who already decided", async () => {
    const { screen } = await renderAdministrator(createMemoryPushPlatform("denied"));

    await act(async () => undefined);
    expect(screen.queryByRole("button", { name: "Activar notificaciones" })).toBeNull();
  });
});

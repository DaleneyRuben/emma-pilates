import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const notificationId = "11111111-1111-4111-8111-111111111111";
const subscriptionPush = {
  notificationId,
  type: "subscription_expiring",
  destinationType: "subscription",
  destinationId: "22222222-2222-4222-8222-222222222222",
};

function clientFetcher() {
  return routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({
        id: "client-1",
        name: "Lucía Fernández",
        email: "lucia@example.com",
        phone: null,
        referralCode: "REF-LUCIA",
      }),
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({
        status: "active",
        subscription: {
          id: "subscription-1",
          planName: "Paquete de 8 clases",
          originalClassAllowance: 8,
          remainingClassAllowance: 5,
          startsOn: "2026-09-11",
          endsOn: "2026-10-11",
        },
      }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 3 }),
    [`POST /api/v1/notifications/${notificationId}/read`]: () =>
      new Response(null, { status: 204 }),
    "PUT /api/v1/notifications/devices/current": () => new Response(null, { status: 204 }),
  });
}

async function renderSignedIn(device = createMemoryPushPlatform()) {
  const fetcher = clientFetcher();
  const screen = await render(
    <App
      runtime={createClientRuntime(fetcher, {
        installationIdentifier: () => Promise.resolve("installation-1"),
        pushPlatform: device.platform,
      })}
    />,
  );
  await waitFor(
    () => expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  return { device, fetcher, screen };
}

describe("Client push notifications (NOT-002)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("registers this installation for the signed-in Client", async () => {
    const { fetcher } = await renderSignedIn();

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/notifications/devices/current",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("opens a tapped push's destination and marks it read", async () => {
    const { device, fetcher, screen } = await renderSignedIn();

    await act(async () => device.tap(subscriptionPush));

    await waitFor(() => expect(screen.getByText("Mi plan")).toBeOnTheScreen());
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/notifications/${notificationId}/read`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("opens the push that launched the app once navigation is ready", async () => {
    const { screen } = await renderSignedIn(
      createMemoryPushPlatform("granted", { launchTap: subscriptionPush }),
    );

    await waitFor(() => expect(screen.getByText("Mi plan")).toBeOnTheScreen());
  });

  it("keeps the app badge on the unread count", async () => {
    const { device } = await renderSignedIn();

    await waitFor(() => expect(device.state.badgeCounts.at(-1)).toBe(3));
  });

  it("stays on Home for a push whose destination it does not know", async () => {
    const { device, screen } = await renderSignedIn();

    await act(async () => device.tap({ ...subscriptionPush, destinationType: "trainer_schedule" }));
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));

    expect(screen.queryByText("Mi plan")).toBeNull();
  });
});

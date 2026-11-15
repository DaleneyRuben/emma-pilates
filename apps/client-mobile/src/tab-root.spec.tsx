import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(30_000);

const subscriptionPush = {
  notificationId: "11111111-1111-4111-8111-111111111111",
  type: "subscription_expiring",
  destinationType: "subscription",
  destinationId: "22222222-2222-4222-8222-222222222222",
};

function clientFetcher() {
  return routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({
        id: "client-1",
        name: "Carla Ruiz",
        email: "carla@example.com",
        phone: null,
        referralCode: "REF-CARLA",
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
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "POST /api/v1/notifications/11111111-1111-4111-8111-111111111111/read": () =>
      new Response(null, { status: 204 }),
    "PUT /api/v1/notifications/devices/current": () => new Response(null, { status: 204 }),
  });
}

async function renderSignedIn() {
  const device = createMemoryPushPlatform();
  const screen = await render(
    <App
      runtime={createClientRuntime(clientFetcher(), {
        installationIdentifier: () => Promise.resolve("installation-1"),
        pushPlatform: device.platform,
      })}
    />,
  );
  await waitFor(
    () =>
      expect(screen.getByTestId("tab-booking", { includeHiddenElements: true })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  return { device, screen };
}

type Screen = Awaited<ReturnType<typeof renderSignedIn>>["screen"];

const tab = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${name}, tab`) }));

const expectProfileRoot = async (screen: Screen) => {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen(),
  );
  expect(screen.queryByRole("header", { name: "Mi plan" })).toBeNull();
};

// Walkthrough n.º 55: tapping Perfil always lands on Perfil, wherever Mi plan
// was opened from.
describe("tapping a Client tab after Mi plan", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens Perfil after Mi plan was opened from Perfil", async () => {
    const { screen } = await renderSignedIn();

    await tab(screen, "Perfil");
    await fireEvent.press(await screen.findByRole("button", { name: /^Mi plan/ }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());
    await tab(screen, "Perfil");

    await expectProfileRoot(screen);
  });

  it("opens Perfil after a notification opened Mi plan", async () => {
    const { device, screen } = await renderSignedIn();

    await act(async () => device.tap(subscriptionPush));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());
    await tab(screen, "Inicio");
    await tab(screen, "Perfil");

    await expectProfileRoot(screen);
  });

  it("opens Perfil when tapped while a notification's Mi plan is showing", async () => {
    const { device, screen } = await renderSignedIn();

    await act(async () => device.tap(subscriptionPush));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());
    await tab(screen, "Perfil");

    await expectProfileRoot(screen);
  });
});

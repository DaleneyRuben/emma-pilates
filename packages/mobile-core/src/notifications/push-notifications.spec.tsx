import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { clearMobileQueryCache, MobileQueryProvider } from "../query/provider";
import { PushNotificationsProvider, usePushNotifications } from "./push-notifications";
import type { PushPermissionStatus, PushPlatform } from "./push-platform";

const notificationId = "11111111-1111-4111-8111-111111111111";
const payload = {
  notificationId,
  type: "waitlist_promoted",
  destinationType: "booking",
  destinationId: "22222222-2222-4222-8222-222222222222",
};
const day = 24 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function fakePlatform(status: PushPermissionStatus = "granted") {
  const listeners = {
    token: [] as (() => void)[],
    received: [] as (() => void)[],
    tap: [] as ((data: unknown) => void)[],
  };
  const subscribe =
    <Listener,>(list: Listener[]) =>
    (listener: Listener) => {
      list.push(listener);
      return () => list.splice(list.indexOf(listener), 1);
    };
  let current = status;
  const platform: PushPlatform & { listeners: typeof listeners } = {
    listeners,
    os: "ios",
    getPermissionStatus: jest.fn(() => Promise.resolve(current)),
    requestPermission: jest.fn(() => {
      current = "granted";
      return Promise.resolve(current);
    }),
    prepareChannels: jest.fn().mockResolvedValue(undefined),
    getPushToken: jest.fn().mockResolvedValue("ExponentPushToken[abc]"),
    onPushTokenChange: subscribe(listeners.token),
    onNotificationReceived: subscribe(listeners.received),
    onNotificationTap: subscribe(listeners.tap),
    takeLaunchTap: jest.fn().mockResolvedValue(null),
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    openSettings: jest.fn().mockResolvedValue(undefined),
  };
  return platform;
}

function createFetcher({ unread = 2, readStatus = 204 } = {}) {
  return jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/notifications/unread-count") {
      return Promise.resolve(jsonResponse({ unread }));
    }
    if (path.endsWith("/read")) {
      return Promise.resolve(new Response(null, { status: readStatus }));
    }
    if (path.startsWith("/api/v1/notifications/devices/current")) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.reject(new Error(`unexpected ${init?.method ?? "GET"} ${path}`));
  });
}

function OfferButton() {
  const { offerPermission } = usePushNotifications();
  return (
    <Pressable accessibilityRole="button" onPress={offerPermission}>
      <Text>Reservar</Text>
    </Pressable>
  );
}

async function renderProvider({
  platform = fakePlatform(),
  fetcher = createFetcher(),
  onOpen = jest.fn(),
  now = () => 1_791_468_000_000,
  registrationEnabled,
}: {
  platform?: ReturnType<typeof fakePlatform>;
  fetcher?: ReturnType<typeof createFetcher>;
  onOpen?: jest.Mock;
  now?: () => number;
  registrationEnabled?: boolean;
} = {}) {
  const screen = await render(
    <MobileQueryProvider>
      <PushNotificationsProvider
        fetcher={fetcher}
        installationId={() => Promise.resolve("installation-1")}
        now={now}
        onOpen={onOpen}
        permissionReason="Te avisamos si tu clase cambia."
        platform={platform}
        registrationEnabled={registrationEnabled}
      >
        <OfferButton />
      </PushNotificationsProvider>
    </MobileQueryProvider>,
  );
  return { screen, platform, fetcher, onOpen };
}

const calls = (fetcher: jest.Mock, suffix: string) =>
  fetcher.mock.calls.filter(([input]) => String(input).endsWith(suffix));

describe("PushNotificationsProvider", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    await AsyncStorage.clear();
  });

  it("registers the installation at start and again when the token changes", async () => {
    const { fetcher, platform } = await renderProvider();

    await waitFor(() => expect(calls(fetcher, "/devices/current")).toHaveLength(1));
    await act(async () => platform.listeners.token.forEach((listener) => listener()));
    await waitFor(() => expect(calls(fetcher, "/devices/current")).toHaveLength(2));
  });

  it("registers nothing while the Administrator sees the app as someone else (FUT-001)", async () => {
    const { fetcher, platform, screen } = await renderProvider({ registrationEnabled: false });

    await act(async () => platform.listeners.token.forEach((listener) => listener()));
    await waitFor(() => expect(calls(fetcher, "/unread-count").length).toBeGreaterThan(0));
    expect(calls(fetcher, "/devices/current")).toHaveLength(0);
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    });
    expect(screen.queryByText("Te avisamos si tu clase cambia.")).not.toBeOnTheScreen();
  });

  it("marks a tapped entry read, then opens its destination", async () => {
    const { fetcher, onOpen, platform } = await renderProvider();

    await act(async () => platform.listeners.tap.forEach((listener) => listener(payload)));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(payload));
    expect(calls(fetcher, `/api/v1/notifications/${notificationId}/read`)).toHaveLength(1);
  });

  it("opens the tap that launched the app", async () => {
    const platform = fakePlatform();
    (platform.takeLaunchTap as jest.Mock).mockResolvedValue(payload);

    const { onOpen } = await renderProvider({ platform });

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(payload));
  });

  it("ignores a malformed tap", async () => {
    const { fetcher, onOpen, platform } = await renderProvider();

    await act(async () =>
      platform.listeners.tap.forEach((listener) =>
        listener({ ...payload, destinationType: "https://evil.example" }),
      ),
    );

    expect(onOpen).not.toHaveBeenCalled();
    expect(calls(fetcher, "/read")).toHaveLength(0);
  });

  it("opens nothing for an entry the signed-in Account does not own", async () => {
    const { fetcher, onOpen, platform } = await renderProvider({
      fetcher: createFetcher({ readStatus: 404 }),
    });

    await act(async () => platform.listeners.tap.forEach((listener) => listener(payload)));

    await waitFor(() => expect(calls(fetcher, "/read")).toHaveLength(1));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("sets the app badge from the unread count and clears it on sign-out", async () => {
    const { platform, screen } = await renderProvider({ fetcher: createFetcher({ unread: 4 }) });

    await waitFor(() => expect(platform.setBadgeCount).toHaveBeenLastCalledWith(4));
    await screen.unmount();
    expect(platform.setBadgeCount).toHaveBeenLastCalledWith(0);
  });

  it("explains the value first and asks the system only on the person's yes", async () => {
    const platform = fakePlatform("undetermined");
    const { fetcher, screen } = await renderProvider({ platform });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() =>
      expect(screen.getByText("Te avisamos si tu clase cambia.")).toBeOnTheScreen(),
    );
    expect(platform.requestPermission).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Activar notificaciones" }));

    await waitFor(() => expect(platform.requestPermission).toHaveBeenCalled());
    await waitFor(() => expect(calls(fetcher, "/devices/current")).toHaveLength(1));
    expect(screen.queryByText("Te avisamos si tu clase cambia.")).toBeNull();
  });

  it("hides the explanation for thirty days after «Ahora no»", async () => {
    const platform = fakePlatform("undetermined");
    let clock = 1_791_468_000_000;
    const { screen } = await renderProvider({ platform, now: () => clock });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Ahora no" }));
    await waitFor(() => expect(screen.queryByText("Te avisamos si tu clase cambia.")).toBeNull());

    clock += 29 * day;
    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await act(async () => undefined);
    expect(screen.queryByText("Te avisamos si tu clase cambia.")).toBeNull();

    clock += 2 * day;
    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() =>
      expect(screen.getByText("Te avisamos si tu clase cambia.")).toBeOnTheScreen(),
    );
  });

  it.each(["granted", "denied"] as const)(
    "offers nothing once permission is %s",
    async (status) => {
      const { screen } = await renderProvider({ platform: fakePlatform(status) });

      await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
      await act(async () => undefined);

      expect(screen.queryByText("Te avisamos si tu clase cambia.")).toBeNull();
    },
  );
});

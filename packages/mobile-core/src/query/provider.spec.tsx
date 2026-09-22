import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import {
  dehydrate,
  onlineManager,
  QueryClient,
  type QueryClient as QueryClientType,
  useIsRestoring,
  useQueryClient,
} from "@tanstack/react-query";
import { Text } from "react-native";

import {
  createMobilePersister,
  getPersistedCacheKey,
  persistedCacheVersion,
} from "./persistence";
import { clearMobileQueryCache, MobileQueryProvider } from "./provider";

let providedClient: QueryClientType | undefined;

function QueryClientProbe() {
  providedClient = useQueryClient();

  return <Text>query client available</Text>;
}

function RestoredBookingsProbe() {
  const client = useQueryClient();
  const restoring = useIsRestoring();
  providedClient = client;

  return (
    <Text>
      {restoring
        ? "restoring"
        : JSON.stringify(client.getQueryData(["/api/v1/bookings"]) ?? null)}
    </Text>
  );
}

describe("MobileQueryProvider", () => {
  afterEach(async () => {
    clearMobileQueryCache();
    onlineManager.setOnline(true);
    await AsyncStorage.clear();
  });

  it("provides the mobile QueryClient to app content", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <QueryClientProbe />
      </MobileQueryProvider>,
    );

    expect(screen.getByText("query client available")).toBeOnTheScreen();
  });

  it("clears in-memory server state on logout", async () => {
    await render(
      <MobileQueryProvider>
        <QueryClientProbe />
      </MobileQueryProvider>,
    );
    providedClient?.setQueryData(["sessions"], [{ id: "session-1" }]);

    clearMobileQueryCache();

    expect(providedClient?.getQueryData(["sessions"])).toBeUndefined();
  });

  it("restores the signed-in Account's persisted read-only cache", async () => {
    const seeded = new QueryClient();
    seeded.setQueryData(["/api/v1/bookings"], [{ bookingId: "booking-1" }]);
    await createMobilePersister("account-1").persistClient({
      buster: persistedCacheVersion,
      clientState: dehydrate(seeded),
      timestamp: Date.now(),
    });

    const screen = await render(
      <MobileQueryProvider accountId="account-1">
        <RestoredBookingsProbe />
      </MobileQueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/booking-1/)).toBeOnTheScreen();
    });
  });

  it("persists only allowlisted queries under the Account key", async () => {
    await render(
      <MobileQueryProvider accountId="account-2">
        <RestoredBookingsProbe />
      </MobileQueryProvider>,
    );
    await waitFor(() => {
      expect(providedClient).toBeDefined();
    });

    act(() => {
      providedClient?.setQueryData(["/api/v1/bookings"], [
        { bookingId: "booking-2" },
      ]);
      providedClient?.setQueryData(["/api/v1/notifications", { limit: 50 }], {
        items: [{ id: "n-secret" }],
      });
    });

    await waitFor(
      async () => {
        const stored = await AsyncStorage.getItem(
          getPersistedCacheKey("account-2"),
        );
        expect(stored).toContain("booking-2");
        expect(stored).not.toContain("n-secret");
      },
      { timeout: 4_000 },
    );
  });

  it("shows an offline banner while the device has no connectivity", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <QueryClientProbe />
      </MobileQueryProvider>,
    );

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(
      screen.getByText("Sin conexión. Mostrando la última información guardada."),
    ).toBeOnTheScreen();

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(
      screen.queryByText(
        "Sin conexión. Mostrando la última información guardada.",
      ),
    ).not.toBeOnTheScreen();
  });
});

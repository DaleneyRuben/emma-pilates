import { act, render } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

import { MobileQueryProvider } from "./provider";
import { Text } from "../ui/text";

type NetState = { isConnected: boolean | null };
const mockNetListeners: ((state: NetState) => void)[] = [];
const mockNetFetch = jest.fn<Promise<NetState>, []>();

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: (listener: (state: NetState) => void) => {
    mockNetListeners.push(listener);
    return () => undefined;
  },
  fetch: () => mockNetFetch(),
}));

const banner = "Sin conexión. Mostrando la última información guardada.";

// Walkthrough n.º 71, addendum: after the connection dropped, the app stayed
// «Sin conexión» with stale data until it was relaunched, because the
// reconnect event never came. It asks again on its own.
describe("leaving offline mode", () => {
  let appStateChange: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockNetListeners.length = 0;
    mockNetFetch.mockResolvedValue({ isConnected: false });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      appStateChange = handler;
      return { remove: () => undefined };
    });
  });

  afterEach(async () => {
    await act(async () => onlineManager.setOnline(true));
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const goOffline = async () => {
    const screen = await render(
      <MobileQueryProvider>
        <Text variant="cuerpo">Inicio</Text>
      </MobileQueryProvider>,
    );
    await act(async () => mockNetListeners.forEach((listener) => listener({ isConnected: false })));
    expect(screen.getByText(banner)).toBeOnTheScreen();
    return screen;
  };

  it("checks again every few seconds while offline", async () => {
    const screen = await goOffline();

    mockNetFetch.mockResolvedValue({ isConnected: true });
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(screen.queryByText(banner)).toBeNull();
  });

  it("checks again when the app comes back to the foreground", async () => {
    const screen = await goOffline();

    mockNetFetch.mockResolvedValue({ isConnected: true });
    await act(async () => appStateChange?.("active"));

    expect(screen.queryByText(banner)).toBeNull();
  });
});

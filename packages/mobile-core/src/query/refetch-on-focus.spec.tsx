import { NavigationContext } from "@react-navigation/native";
import { act, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

import { useRefetchOnFocus } from "./refetch-on-focus";

type Listener = () => void;

// The slice of a react-navigation screen's `navigation` the hook relies on.
function fakeNavigation() {
  const listeners: Record<string, Listener[]> = { blur: [], focus: [] };
  return {
    emit: (type: "blur" | "focus") => listeners[type]?.forEach((listener) => listener()),
    navigation: {
      addListener: (type: string, listener: Listener) => {
        listeners[type] = [...(listeners[type] ?? []), listener];
        return () => {
          listeners[type] = (listeners[type] ?? []).filter((item) => item !== listener);
        };
      },
      isFocused: () => true,
    } as unknown as NonNullable<React.ContextType<typeof NavigationContext>>,
  };
}

function Probe({ queryFn }: { queryFn: () => Promise<string> }) {
  const bookings = useQuery({ queryKey: ["/api/v1/bookings"], queryFn });
  useRefetchOnFocus([["/api/v1/bookings"]]);
  return <Text>{bookings.data ?? "loading"}</Text>;
}

describe("useRefetchOnFocus", () => {
  it("fetches once on mount and again only when the screen regains focus", async () => {
    const { emit, navigation } = fakeNavigation();
    const queryFn = jest.fn().mockResolvedValue("fresh");
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <NavigationContext.Provider value={navigation}>
          <Probe queryFn={queryFn} />
        </NavigationContext.Provider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("fresh")).toBeOnTheScreen());
    expect(queryFn).toHaveBeenCalledTimes(1);

    // The focus that comes with the mount is the mount fetch's; nothing more.
    await act(async () => emit("focus"));
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => emit("blur"));
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => emit("focus"));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    // A background refetch keeps the data on screen instead of a loading state.
    expect(screen.getByText("fresh")).toBeOnTheScreen();
  });

  it("does nothing outside a navigator", async () => {
    const queryFn = jest.fn().mockResolvedValue("fresh");
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <Probe queryFn={queryFn} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("fresh")).toBeOnTheScreen());
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ScrollView, Text } from "react-native";

import { colors } from "../ui/tokens";
import { usePullToRefresh } from "./pull-to-refresh";

function Probe({ queryFn }: { queryFn: () => Promise<string> }) {
  const bookings = useQuery({ queryKey: ["/api/v1/bookings"], queryFn });
  const refreshControl = usePullToRefresh([["/api/v1/bookings"]]);
  return (
    <ScrollView refreshControl={refreshControl} testID="probe-scroll">
      <Text>{bookings.data ?? "loading"}</Text>
      <Text>{refreshControl.props.refreshing ? "refreshing" : "idle"}</Text>
    </ScrollView>
  );
}

describe("usePullToRefresh", () => {
  it("draws the native control in Palo de rosa on both platforms", async () => {
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <Probe queryFn={jest.fn().mockResolvedValue("fresh")} />
      </QueryClientProvider>,
    );
    const control = screen.getByTestId("probe-scroll").children[0];
    expect(control).toHaveProp("tintColor", colors.primary);
    expect(control).toHaveProp("colors", [colors.primary]);
  });

  it("refetches the screen's queries on a pull and spins only meanwhile", async () => {
    let resolveSecond: (value: string) => void = () => undefined;
    const queryFn = jest
      .fn<Promise<string>, []>()
      .mockResolvedValueOnce("stale")
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <Probe queryFn={queryFn} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("stale")).toBeOnTheScreen());
    expect(screen.getByText("idle")).toBeOnTheScreen();

    await fireEvent(screen.getByTestId("probe-scroll").children[0], "refresh");

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(screen.getByText("refreshing")).toBeOnTheScreen();
    expect(screen.getByText("stale")).toBeOnTheScreen();

    await act(async () => resolveSecond("fresh"));
    await waitFor(() => expect(screen.getByText("fresh")).toBeOnTheScreen());
    expect(screen.getByText("idle")).toBeOnTheScreen();
  });
});

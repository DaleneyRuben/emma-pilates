import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text } from "react-native";

import { clearMobileQueryCache, MobileQueryProvider } from "./provider";

const banner = "Sin conexión. Mostrando la última información guardada.";

function Screen({
  load,
  name = "unreachable-spec",
}: {
  load: () => Promise<string>;
  name?: string;
}) {
  const query = useQuery({ queryFn: load, queryKey: [name] });
  return (
    <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
      <Text>{query.data ?? "Cargando"}</Text>
    </Pressable>
  );
}

// FIX-090 (states review Y7): the device can say it is online while the API
// cannot be reached. Inicio drew its own banner then, and every other screen
// only «No pudimos cargar…». The one banner now shows on every screen.
describe("the offline banner when the API cannot be reached", () => {
  afterEach(() => clearMobileQueryCache());

  it("shows after a request fails to connect and goes once one gets through", async () => {
    let reachable = false;
    const load = () =>
      reachable
        ? Promise.resolve("Inicio")
        : Promise.reject(new TypeError("Network request failed"));
    const screen = await render(
      <MobileQueryProvider>
        <Screen load={load} />
      </MobileQueryProvider>,
    );

    await waitFor(() => expect(screen.getByText(banner)).toBeOnTheScreen());

    reachable = true;
    await fireEvent.press(screen.getByRole("button", { name: "Cargando" }));

    await waitFor(() => expect(screen.getByText("Inicio")).toBeOnTheScreen());
    expect(screen.queryByText(banner)).toBeNull();
  });

  it("stays away when the API answers with an error of its own", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <Screen load={() => Promise.reject(new Error("problem"))} />
      </MobileQueryProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText("Cargando")).toBeOnTheScreen();
    expect(screen.queryByText(banner)).toBeNull();
  });

  it("stays while a screen's request still fails, though another got through", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <Screen load={() => Promise.reject(new TypeError("Network request failed"))} />
        <Screen
          load={() => new Promise((resolve) => setTimeout(() => resolve("Reglas"), 20))}
          name="other-spec"
        />
      </MobileQueryProvider>,
    );

    await waitFor(() => expect(screen.getByText("Reglas")).toBeOnTheScreen());
    expect(screen.getByText(banner)).toBeOnTheScreen();
  });
});

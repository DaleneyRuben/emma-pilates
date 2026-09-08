import { render } from "@testing-library/react-native";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";

import { clearMobileQueryCache, MobileQueryProvider } from "./provider";

let providedClient: QueryClient | undefined;

function QueryClientProbe() {
  providedClient = useQueryClient();

  return <Text>query client available</Text>;
}

describe("MobileQueryProvider", () => {
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
});

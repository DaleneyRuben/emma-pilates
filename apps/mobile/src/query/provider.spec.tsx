import { render } from "@testing-library/react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";

import { MobileQueryProvider } from "./provider";

function QueryClientProbe() {
  useQueryClient();

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
});

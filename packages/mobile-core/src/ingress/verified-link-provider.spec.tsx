import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { useVerifiedLinkIntent, VerifiedLinkProvider } from "./verified-link-provider";

function IntentProbe() {
  const { intent } = useVerifiedLinkIntent();

  return <Text>{intent === null ? "no-intent" : `${intent.type}:${intent.token}`}</Text>;
}

describe("VerifiedLinkProvider", () => {
  it("makes a verified authentication-link intent available to mobile screens", async () => {
    const screen = await render(
      <VerifiedLinkProvider
        allowedHosts={["links.emmapilates.test"]}
        source={{
          addEventListener: () => ({ remove: jest.fn() }),
          getInitialURL: async () =>
            "https://links.emmapilates.test/authentication/recover-password?token=recovery",
        }}
      >
        <IntentProbe />
      </VerifiedLinkProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("recover-password:recovery")).toBeOnTheScreen();
    });
  });
});

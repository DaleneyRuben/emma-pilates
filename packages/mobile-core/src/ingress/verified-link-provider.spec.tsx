import { render, waitFor } from "@testing-library/react-native";

import { useVerifiedLinkIntent, VerifiedLinkProvider } from "./verified-link-provider";
import { Text } from "../ui/text";

function IntentProbe() {
  const { intent } = useVerifiedLinkIntent();

  return (
    <Text variant="cuerpo">{intent === null ? "no-intent" : `${intent.type}:${intent.token}`}</Text>
  );
}

describe("VerifiedLinkProvider", () => {
  it("makes a verified authentication-link intent available to mobile screens", async () => {
    const screen = await render(
      <VerifiedLinkProvider
        allowedHosts={["links.emmapilates.test"]}
        identityKind="client"
        source={{
          addEventListener: () => ({ remove: jest.fn() }),
          getInitialURL: async () =>
            "https://links.emmapilates.test/client/authentication/recover-password?token=recovery",
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

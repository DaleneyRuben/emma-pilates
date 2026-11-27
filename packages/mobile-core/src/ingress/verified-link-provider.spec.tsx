import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

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

describe("VerifiedLinkProvider clearing", () => {
  function ClearingProbe() {
    const { clearIntent, intent } = useVerifiedLinkIntent();

    return (
      <Text onPress={() => intent !== null && clearIntent(intent)} variant="cuerpo">
        {intent === null ? "no-intent" : `${intent.type}:${intent.token}`}
      </Text>
    );
  }

  it("forgets a link once the app reports it handled (walkthrough n.º 17)", async () => {
    const screen = await render(
      <VerifiedLinkProvider
        allowedHosts={["links.emmapilates.test"]}
        identityKind="client"
        source={{
          addEventListener: () => ({ remove: jest.fn() }),
          getInitialURL: async () =>
            "https://links.emmapilates.test/client/authentication/verify-email?token=used",
        }}
      >
        <ClearingProbe />
      </VerifiedLinkProvider>,
    );

    await waitFor(() => expect(screen.getByText("verify-email:used")).toBeOnTheScreen());
    await fireEvent.press(screen.getByText("verify-email:used"));

    expect(screen.getByText("no-intent")).toBeOnTheScreen();
  });

  it("keeps a newer link when an older one is reported handled", async () => {
    let emit: (event: { url: string }) => void = () => undefined;
    let stale: { clearIntent: (intent: never) => void; intent: unknown } | null = null;
    function StaleProbe() {
      const state = useVerifiedLinkIntent();
      if (stale === null && state.intent !== null) stale = state as never;
      const { intent } = state;
      return (
        <Text variant="cuerpo">
          {intent === null ? "no-intent" : `${intent.type}:${intent.token}`}
        </Text>
      );
    }
    const screen = await render(
      <VerifiedLinkProvider
        allowedHosts={["links.emmapilates.test"]}
        identityKind="client"
        source={{
          addEventListener: (_type: "url", listener: (event: { url: string }) => void) => {
            emit = listener;
            return { remove: jest.fn() };
          },
          getInitialURL: async () =>
            "https://links.emmapilates.test/client/authentication/verify-email?token=old",
        }}
      >
        <StaleProbe />
      </VerifiedLinkProvider>,
    );
    await waitFor(() => expect(screen.getByText("verify-email:old")).toBeOnTheScreen());

    await act(() =>
      emit({
        url: "https://links.emmapilates.test/client/authentication/recover-password?token=new",
      }),
    );
    const older = stale as unknown as { clearIntent: (i: unknown) => void; intent: unknown };
    await act(() => older.clearIntent(older.intent));

    expect(screen.getByText("recover-password:new")).toBeOnTheScreen();
  });
});

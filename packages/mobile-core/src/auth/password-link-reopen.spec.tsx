import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

type Inspection = Awaited<ReturnType<AuthenticationApi["inspectLink"]>>;

function apiAnswering(...inspections: Inspection[]): AuthenticationApi {
  const inspectLink = jest.fn();
  for (const inspection of inspections) inspectLink.mockResolvedValueOnce(inspection);
  return {
    activateAccount: jest.fn(),
    inspectLink,
  } as unknown as AuthenticationApi;
}

const current: Inspection = { purpose: "activation", status: "current" };
const used: Inspection = { purpose: "activation", status: "expired" };

// FIX-090 (states review Y8): a link already used reported so only after she
// typed her password twice. The screen had checked it once, while it was
// still good, and kept that answer when the link was opened again or the app
// came back to the front.
describe("an activation link checked again", () => {
  afterEach(() => jest.restoreAllMocks());

  it("checks the link again when it is opened again", async () => {
    const api = apiAnswering(current, used);
    const screen = await render(
      <AuthenticationFlow api={api} intent={{ token: "link-token", type: "activate-account" }} />,
    );
    expect(await screen.findByText("Crea tu contraseña")).toBeOnTheScreen();

    await screen.rerender(
      <AuthenticationFlow api={api} intent={{ token: "link-token", type: "activate-account" }} />,
    );

    expect(await screen.findByText("Este enlace ya no es válido")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull();
  });

  it("checks the link again when the app comes back to the front", async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const api = apiAnswering(current, used);
    const screen = await render(
      <AuthenticationFlow api={api} intent={{ token: "link-token", type: "activate-account" }} />,
    );
    expect(await screen.findByText("Crea tu contraseña")).toBeOnTheScreen();

    await act(async () => onChange?.("active"));

    await waitFor(() => expect(screen.getByText("Este enlace ya no es válido")).toBeOnTheScreen());
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull();
  });

  it("keeps a good link when a check on return fails to reach the server", async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const api = apiAnswering(current);
    (api.inspectLink as jest.Mock).mockRejectedValueOnce(new TypeError("Network request failed"));
    const screen = await render(
      <AuthenticationFlow api={api} intent={{ token: "link-token", type: "activate-account" }} />,
    );
    expect(await screen.findByText("Crea tu contraseña")).toBeOnTheScreen();

    await act(async () => onChange?.("active"));

    expect(screen.getByLabelText("Contraseña nueva")).toBeOnTheScreen();
    expect(screen.queryByText("Este enlace ya no es válido")).toBeNull();
  });
});

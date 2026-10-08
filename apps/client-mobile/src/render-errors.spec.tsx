import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../App";
import { createClientRuntime, routeFetcher } from "./test-support";

let mockHomeFails = false;
let mockFlowFails = false;

jest.mock("./home/home-screen", () => {
  const { createElement } = require("react");
  const { Text } = require("react-native");
  return {
    HomeScreen: () => {
      if (mockHomeFails) {
        throw new Error("mob-053 probe");
      }
      return createElement(Text, null, "Inicio recuperado");
    },
  };
});

jest.mock("@pilates/mobile-core", () => {
  const actual = jest.requireActual<typeof import("@pilates/mobile-core")>("@pilates/mobile-core");
  const { createElement } = require("react");
  return {
    ...actual,
    AuthenticationFlow: (props: Parameters<typeof actual.AuthenticationFlow>[0]) => {
      if (mockFlowFails) {
        throw new Error("mob-053 probe");
      }
      return createElement(actual.AuthenticationFlow, props);
    },
  };
});

describe("Client App render errors (MOB-053)", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockHomeFails = false;
    mockFlowFails = false;
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("replaces a screen that throws with the recovery screen, keeps the tabs, and draws it again on Reintentar", async () => {
    mockHomeFails = true;
    const screen = await render(<App runtime={createClientRuntime(routeFetcher({}))} />);

    await waitFor(() => {
      expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Perfil, tab, 4 of 4")).toBeOnTheScreen();
    expect(screen.queryByText("Inicio recuperado")).not.toBeOnTheScreen();

    mockHomeFails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Inicio recuperado")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Algo salió mal")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Perfil, tab, 4 of 4")).toBeOnTheScreen();
  });

  it("shows the recovery screen when the authentication flow throws and restarts it on Reintentar", async () => {
    mockFlowFails = true;
    const runtime = createClientRuntime(routeFetcher({}));
    runtime.sessionManager.restore.mockResolvedValue(null);
    const screen = await render(<App runtime={runtime} />);

    await waitFor(() => {
      expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();
    });

    mockFlowFails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Algo salió mal")).not.toBeOnTheScreen();
  });
});

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../App";
import { createStaffRuntime, routeFetcher } from "./test-support";

let mockAgendaFails = false;
let mockFlowFails = false;

jest.mock("./trainer/trainer-agenda-screen", () => {
  const { createElement } = require("react");
  const { Text } = require("react-native");
  return {
    TrainerAgendaScreen: () => {
      if (mockAgendaFails) {
        throw new Error("mob-053 probe");
      }
      return createElement(Text, null, "Agenda recuperada");
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

describe("Staff App render errors (MOB-053)", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockAgendaFails = false;
    mockFlowFails = false;
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("replaces a Role screen that throws with the recovery screen and draws it again on Reintentar", async () => {
    mockAgendaFails = true;
    const screen = await render(<App runtime={createStaffRuntime(routeFetcher({}), "trainer")} />);

    await waitFor(() => {
      expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Agenda recuperada")).not.toBeOnTheScreen();

    mockAgendaFails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Agenda recuperada")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Algo salió mal")).not.toBeOnTheScreen();
  });

  it("shows the recovery screen when the authentication flow throws and restarts it on Reintentar", async () => {
    mockFlowFails = true;
    const runtime = createStaffRuntime(routeFetcher({}));
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

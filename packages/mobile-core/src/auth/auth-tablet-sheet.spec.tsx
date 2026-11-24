import { fireEvent, render } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { WideScreens } from "../ui/tablet-layout";
import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

const api = {
  requestPasswordRecovery: jest.fn().mockResolvedValue({ status: "accepted" }),
} as unknown as AuthenticationApi;

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

afterEach(() => jest.restoreAllMocks());

async function openRecovery(wide: boolean) {
  const flow = <AuthenticationFlow allowClientRegistration api={api} />;
  const screen = await render(wide ? <WideScreens>{flow}</WideScreens> : flow);
  await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
  return screen;
}

// Follow-up 289 (`20T`, `21T`): on a Client tablet the pre-session pages are
// Login A's 560 pt sheet under the logo; the phone keeps its band and card.
describe("pre-session pages on a tablet", () => {
  it("draws Recuperar contraseña as the 560 pt sheet under the logo", async () => {
    windowWidth(834);
    const screen = await openRecovery(true);

    expect(screen.getByTestId("tablet-auth-hero")).toBeOnTheScreen();
    expect(screen.getByLabelText("Emma Pilates Studio")).toHaveStyle({ width: 300 });
    expect(screen.getByTestId("authentication-panel")).toHaveStyle({ maxWidth: 560 });
    expect(screen.getByRole("header", { name: "Recuperar contraseña" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
  });

  it("keeps the phone layout on a phone", async () => {
    windowWidth(390);
    const screen = await openRecovery(true);

    expect(screen.queryByTestId("tablet-auth-hero")).toBeNull();
    expect(screen.getByTestId("screen-header")).toBeOnTheScreen();
  });

  it("keeps the band on a tablet outside WideScreens (the Staff app)", async () => {
    windowWidth(834);
    const screen = await openRecovery(false);

    expect(screen.queryByTestId("tablet-auth-hero")).toBeNull();
  });
});

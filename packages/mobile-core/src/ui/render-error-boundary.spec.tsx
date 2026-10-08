import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { RenderErrorBoundary } from "./render-error-boundary";

const note =
  "No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve a pasar, cierra la app y ábrela otra vez.";

function Child({ fails }: { fails: boolean }) {
  if (fails) {
    throw new Error("mob-053 probe");
  }
  return <Text>Pantalla recuperada</Text>;
}

describe("RenderErrorBoundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("shows the recovery screen instead of crashing when a child throws while rendering", async () => {
    const screen = await render(
      <RenderErrorBoundary>
        <Child fails />
      </RenderErrorBoundary>,
    );

    expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();
    expect(screen.getByText(note)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    expect(screen.queryByText("Pantalla recuperada")).not.toBeOnTheScreen();
  });

  it("reports the caught error and its component stack through console.error", async () => {
    await render(
      <RenderErrorBoundary>
        <Child fails />
      </RenderErrorBoundary>,
    );

    expect(consoleError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: "mob-053 probe" }),
      expect.stringContaining("render-error-boundary.spec.tsx"),
    );
  });

  it("renders the children again on Reintentar and succeeds once the child no longer throws", async () => {
    let fails = true;
    function Probe() {
      return <Child fails={fails} />;
    }
    const screen = await render(
      <RenderErrorBoundary>
        <Probe />
      </RenderErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();

    fails = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByText("Pantalla recuperada")).toBeOnTheScreen();
    expect(screen.queryByText("Algo salió mal")).not.toBeOnTheScreen();
  });

  it("shows the recovery screen again when Reintentar fails the same way", async () => {
    const screen = await render(
      <RenderErrorBoundary>
        <Child fails />
      </RenderErrorBoundary>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByText("Algo salió mal")).toBeOnTheScreen();
  });

  it("renders the children untouched while nothing throws", async () => {
    const screen = await render(
      <RenderErrorBoundary>
        <Child fails={false} />
      </RenderErrorBoundary>,
    );

    expect(screen.getByText("Pantalla recuperada")).toBeOnTheScreen();
    expect(screen.queryByText("Algo salió mal")).not.toBeOnTheScreen();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

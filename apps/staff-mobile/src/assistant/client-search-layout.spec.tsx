import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

const shortcutLabel = "Nueva clienta, crea su ficha si aún no está";
const buttonLabel = "Crear clienta nueva";

describe("Buscar clienta layout (redesign option A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the field in the band and drops the two-letters hint", async () => {
    const screen = await openClientSearch(assistantRoutes());

    const band = screen.getByTestId("root-header");
    expect(band).toContainElement(screen.getByTestId("client-search-input"));
    expect(screen.queryByText(/al menos dos letras/)).toBeNull();
  });

  it("opens Nueva clienta from the shortcuts card before a search", async () => {
    const screen = await openClientSearch(assistantRoutes());

    expect(screen.getByRole("button", { name: shortcutLabel })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: buttonLabel })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: shortcutLabel }));
    await waitFor(() => expect(screen.getByLabelText("Nueva clienta")).toBeOnTheScreen());
  });

  it("puts the outlined button below the results and opens Nueva clienta from it", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver clienta Lucía Fernández" })).toBeOnTheScreen(),
    );
    expect(screen.queryByRole("button", { name: shortcutLabel })).toBeNull();
    const order = screen
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel as string | undefined);
    expect(order.indexOf(buttonLabel)).toBeGreaterThan(
      order.indexOf("Ver clienta Lucía Fernández"),
    );

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => expect(screen.getByLabelText("Nueva clienta")).toBeOnTheScreen());
  });

  it("keeps the button when the search fails", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "/api/v1/assistant/clients?query=luc": () => {
        throw new TypeError("Network request failed");
      },
    });

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await waitFor(() => expect(screen.getByText("No pudimos buscar clientas.")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: buttonLabel })).toBeOnTheScreen();
  });
});

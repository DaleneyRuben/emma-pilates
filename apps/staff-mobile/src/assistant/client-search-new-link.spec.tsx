import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

const linkLabel = "¿No está? Crear cliente nuevo";

describe("Buscar cliente, new as a link (FIX-083, Ronda 2 pick A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("drops the big «Nuevo cliente» button for a quiet link", async () => {
    const screen = await openClientSearch(assistantRoutes());

    expect(screen.queryByText("Nuevo cliente")).toBeNull();
    expect(screen.getByRole("button", { name: linkLabel })).toBeOnTheScreen();
    expect(screen.queryByTestId("icon-row-disc")).toBeNull();
  });

  it("puts the link below the results and opens Nuevo cliente from it", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen(),
    );
    const order = screen
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel as string | undefined);
    expect(order.indexOf(linkLabel)).toBeGreaterThan(order.indexOf("Ver cliente Lucía Fernández"));

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen());
  });

  it("keeps the link when the search fails", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "/api/v1/assistant/clients?query=luc": () => {
        throw new TypeError("Network request failed");
      },
    });

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await waitFor(() => expect(screen.getByText("No pudimos buscar clientes.")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: linkLabel })).toBeOnTheScreen();
  });
});

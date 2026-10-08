import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

// MOB-046: the result row keeps «phone · email» on one line and trims it,
// so the split view's 344 pt column never wraps it under the name.
describe("Assistant search result contact", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("keeps the contact line to one trimmed line", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "luc",
    );
    await waitFor(() => {
      expect(screen.getByText("+591 70011001 · lucia@example.com")).toBeOnTheScreen();
    });

    const contact = screen.getByText("+591 70011001 · lucia@example.com");
    expect(contact).toHaveProp("numberOfLines", 1);
    expect(contact).toHaveProp("ellipsizeMode", "tail");
  });
});

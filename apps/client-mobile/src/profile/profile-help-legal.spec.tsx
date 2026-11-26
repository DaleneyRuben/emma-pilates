import { cleanup, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { openProfile } from "./profile-test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

afterEach(async () => {
  await cleanup();
  clearMobileQueryCache();
});

// Walkthrough n.º 16 (C18, C18s): «Cuenta» keeps the password, Face ID and
// «Cerrar sesión»; feedback, support and privacy move to a last section,
// «Ayuda y legal».
describe("Perfil › Ayuda y legal", () => {
  it("keeps only the account's own rows under Cuenta", async () => {
    const screen = await openProfile();

    const account = within(screen.getByTestId("profile-section-account"));
    expect(account.getByRole("header", { name: "Cuenta" })).toBeOnTheScreen();
    expect(account.getByRole("button", { name: "Cambiar contraseña" })).toBeOnTheScreen();
    expect(account.getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen();
    for (const moved of ["Enviar comentarios", "Soporte", "Política de privacidad"]) {
      expect(account.queryByRole("button", { name: moved })).toBeNull();
    }
  });

  it("lists feedback, support and privacy under Ayuda y legal, after Cuenta", async () => {
    const screen = await openProfile();

    const help = within(screen.getByTestId("profile-section-help"));
    expect(help.getByRole("header", { name: "Ayuda y legal" })).toBeOnTheScreen();
    for (const row of ["Enviar comentarios", "Soporte", "Política de privacidad"]) {
      expect(help.getByRole("button", { name: row })).toBeOnTheScreen();
    }
    // C18: the privacy policy wears the shield, not the padlock.
    expect(help.getByTestId("glyph-shield", hidden)).toBeOnTheScreen();
    expect(help.queryByTestId("glyph-lock", hidden)).toBeNull();
    const titles = screen.getAllByRole("header").map((header) => header.props.children);
    expect(titles.indexOf("Ayuda y legal")).toBeGreaterThan(titles.indexOf("Cuenta"));
  });
});

import { cleanup, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { openProfile } from "./profile-test-support";

/** The test IDs of the rendered tree, in the order they are drawn. */
function drawnOrder(rendered: unknown): string[] {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { children, props } = node as { children?: unknown[]; props?: { testID?: unknown } };
    if (typeof props?.testID === "string") ids.push(props.testID);
    (children ?? []).forEach(walk);
  };
  walk(rendered);
  return ids;
}

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

afterEach(async () => {
  await cleanup();
  clearMobileQueryCache();
});

// Walkthrough n.º 16 (C18, C18s): feedback, support and privacy sit in
// «Ayuda y legal», after «Cuenta». Follow-up 292: «Cuenta» keeps only the
// password and Face ID; «Cerrar sesión» is a card of its own after «Ayuda y
// legal», with the version footer under it.
describe("Perfil › Ayuda y legal", () => {
  it("keeps only the account's own rows under Cuenta", async () => {
    const screen = await openProfile();

    const account = within(screen.getByTestId("profile-section-account"));
    expect(account.getByRole("header", { name: "Cuenta" })).toBeOnTheScreen();
    expect(account.getByRole("button", { name: "Cambiar contraseña" })).toBeOnTheScreen();
    expect(account.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
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
    expect(help.getByText("Contacto y WhatsApp del estudio")).toBeOnTheScreen();
    // C18: the privacy policy wears the shield, not the padlock.
    expect(help.getByTestId("glyph-shield", hidden)).toBeOnTheScreen();
    expect(help.queryByTestId("glyph-lock", hidden)).toBeNull();
    const titles = screen.getAllByRole("header").map((header) => header.props.children);
    expect(titles.indexOf("Ayuda y legal")).toBeGreaterThan(titles.indexOf("Cuenta"));
  });

  it("closes with «Cerrar sesión» on its own card, then the version and «Cerrar mi cuenta»", async () => {
    const screen = await openProfile();

    const order = drawnOrder(screen.toJSON());
    const logout = order.indexOf("profile-logout");
    expect(logout).toBeGreaterThan(order.indexOf("profile-section-help"));
    expect(order.indexOf("profile-close-account")).toBeGreaterThan(logout);
    expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBe(
      screen.getByTestId("profile-logout"),
    );
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#A04640" });
  });
});

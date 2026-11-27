import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, colors } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

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

const trainer = {
  id: "staff-1",
  name: "Daniela Ortiz",
  email: "daniela@example.com",
  phone: "+591 70000002",
  role: "trainer",
  branches: [{ id: "branch-1", name: "Achumani" }],
  photo: null,
};

async function openProfile() {
  const fetcher = routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(trainer),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => expect(screen.getByText("Daniela Ortiz")).toBeOnTheScreen());
  return screen;
}

// Walkthrough n.º 16 (E-F01, E-F02, E-F03, E-F23, E-F24): Staff Perfil
// follows the Client's C18, a deep-rose identity card, serif section titles
// outside white row cards, and «Ayuda» last (follow-up 293).
describe("Staff Perfil layout", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows who she is on the deep-rose card, with only «Cambiar foto»", async () => {
    const screen = await openProfile();

    const identity = screen.getByTestId("profile-identity");
    expect(identity).toHaveStyle({ backgroundColor: colors.emphasis });
    const card = within(identity);
    expect(card.getByText("daniela@example.com")).toBeOnTheScreen();
    expect(card.getByRole("button", { name: "Cambiar foto" })).toBeOnTheScreen();
    expect(card.getByText("Tu nombre y tu correo los actualiza administración.")).toBeOnTheScreen();
    expect(card.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  // Follow-up 293 (E-F01): «Tus pagos», «Ajustes» and «Ayuda», each titled
  // in serif outside its card (staff-profile-groups.spec.tsx has the rows).
  it("titles each group outside its card and closes with Ayuda", async () => {
    const screen = await openProfile();

    const groups = [
      ["profile-group-pay", "Tus pagos"],
      ["profile-group-settings", "Ajustes"],
      ["profile-group-help", "Ayuda"],
    ] as const;
    for (const [testID, title] of groups) {
      const group = within(screen.getByTestId(testID));
      expect(group.getByRole("header", { name: title })).toHaveStyle({
        fontFamily: "Lora_500Medium",
      });
    }
    const order = drawnOrder(screen.toJSON());
    expect(order.indexOf("profile-group-help")).toBeGreaterThan(
      order.indexOf("profile-group-settings"),
    );
    expect(
      within(screen.getByTestId("profile-group-help")).getByTestId("glyph-mail", hidden),
    ).toBeOnTheScreen();
  });

  it("draws each row's icon on a 36 pt round disc", async () => {
    const screen = await openProfile();

    const discs = screen.getAllByTestId("profile-row-disc");
    expect(discs.length).toBeGreaterThan(5);
    expect(discs[0]).toHaveStyle({ backgroundColor: "#FEF6F2", borderRadius: 18, height: 36 });
  });

  // Follow-up 292 (E-F01, E-F23, E-F28): «Cerrar sesión» is a Destructivo
  // card of its own after «Ayuda»; follow-up 293's footer follows it.
  it("closes with «Cerrar sesión» on its own card after Ayuda, then the footer", async () => {
    const screen = await openProfile();

    const settings = within(screen.getByTestId("profile-group-settings"));
    expect(settings.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    const order = drawnOrder(screen.toJSON());
    expect(order.indexOf("profile-logout")).toBeGreaterThan(order.indexOf("profile-group-help"));
    expect(order.indexOf("profile-footer")).toBeGreaterThan(order.indexOf("profile-logout"));
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBe(
      screen.getByTestId("profile-logout"),
    );
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#A04640" });
    // The screen's 10 pt gap plus 14 makes the 24 pt above the card.
    expect(screen.getByTestId("profile-logout")).toHaveStyle({ marginTop: 14 });
  });
});

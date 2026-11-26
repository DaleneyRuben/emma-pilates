import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, colors } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

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
// outside white row cards, and «Ayuda y legal» last.
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

  it("titles each section outside its card and closes with Ayuda y legal", async () => {
    const screen = await openProfile();

    const sections = [
      ["profile-section-account", "Tu cuenta"],
      ["profile-section-settings", "Ajustes"],
      ["profile-section-help", "Ayuda y legal"],
    ] as const;
    for (const [testID, title] of sections) {
      const section = within(screen.getByTestId(testID));
      expect(section.getByRole("header", { name: title })).toHaveStyle({
        fontFamily: "Lora_500Medium",
      });
    }
    const settings = within(screen.getByTestId("profile-section-settings"));
    for (const row of ["Notificaciones", "Cambiar contraseña", "Cerrar sesión"]) {
      expect(settings.getByRole("button", { name: row })).toBeOnTheScreen();
    }
    const help = within(screen.getByTestId("profile-section-help"));
    for (const row of ["Enviar comentarios", "Soporte", "Política de privacidad"]) {
      expect(help.getByRole("button", { name: row })).toBeOnTheScreen();
    }
    expect(help.getByText("Contacto y WhatsApp del estudio")).toBeOnTheScreen();
    expect(help.getByTestId("glyph-shield", hidden)).toBeOnTheScreen();
    expect(settings.queryByRole("button", { name: "Soporte" })).toBeNull();
  });

  it("draws each row's icon on a 36 pt round disc", async () => {
    const screen = await openProfile();

    const discs = screen.getAllByTestId("profile-row-disc");
    expect(discs.length).toBeGreaterThan(5);
    expect(discs[0]).toHaveStyle({ backgroundColor: "#FEF6F2", borderRadius: 18, height: 36 });
  });
});

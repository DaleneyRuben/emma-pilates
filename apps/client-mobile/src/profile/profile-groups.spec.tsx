import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { Linking } from "react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

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

/** A group's rows, as a screen reader names them, in order. */
function rowsOf(screen: Awaited<ReturnType<typeof openProfile>>, testID: string) {
  return within(screen.getByTestId(testID))
    .getAllByRole(/^(button|switch)$/)
    .map((row) => String(row.props.accessibilityLabel));
}

function runtimeWithBiometrics(available: boolean) {
  const runtime = createClientRuntime(routeFetcher(readRoutes));
  return {
    ...runtime,
    sessionManager: { ...runtime.sessionManager, canUseBiometrics: () => available },
  };
}

afterEach(async () => {
  await cleanup();
  clearMobileQueryCache();
});

// Follow-up 293 (C18, C18s; owner 2026-11-27): no Perfil group holds a single
// row. «Tu plan», «Ajustes» and «Ayuda», then «Cerrar sesión» on its own card
// and a quiet footer straight on the page.
describe("Client Perfil groups", () => {
  it("draws Tu plan, Ajustes and Ayuda in that order, and no other group", async () => {
    const screen = await openProfile(runtimeWithBiometrics(true));

    const titles = screen.getAllByRole("header").map((header) => header.props.children);
    expect(titles).toEqual(["Perfil", "Tu plan", "Ajustes", "Ayuda"]);
  });

  it("lists Plan actual, Evaluación nutricional, Invita a una amiga and Facturas under Tu plan", async () => {
    const screen = await openProfile();

    expect(rowsOf(screen, "profile-group-plan")).toEqual([
      "Plan actual, Plan vencido",
      "Evaluación nutricional",
      "Invita a una amiga",
      "Facturas",
    ]);
  });

  it("lists Notificaciones, Cambiar contraseña and Entrar con Face ID under Ajustes", async () => {
    const screen = await openProfile(runtimeWithBiometrics(true));

    expect(rowsOf(screen, "profile-group-settings")).toEqual([
      "Notificaciones",
      "Cambiar contraseña",
      "Entrar con Face ID",
    ]);
  });

  it("keeps two rows in Ajustes on a phone without Face ID", async () => {
    const screen = await openProfile(runtimeWithBiometrics(false));

    expect(rowsOf(screen, "profile-group-settings")).toEqual([
      "Notificaciones",
      "Cambiar contraseña",
    ]);
  });

  it("starts Ayuda with Envíanos tu opinión, then Preguntas frecuentes, with no subtitles", async () => {
    const screen = await openProfile();

    expect(rowsOf(screen, "profile-group-help")).toEqual([
      "Envíanos tu opinión",
      "Preguntas frecuentes",
    ]);
    const help = within(screen.getByTestId("profile-group-help"));
    expect(help.getByTestId("glyph-message", hidden)).toBeOnTheScreen();
    expect(help.getByTestId("glyph-mail", hidden)).toBeOnTheScreen();
    expect(screen.queryByText("Contacto y WhatsApp del estudio")).toBeNull();
    for (const gone of ["Enviar comentarios", "Soporte", "Mi plan", "Mis facturas"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });

  it("never leaves a group with a single row, with or without Face ID", async () => {
    for (const available of [true, false]) {
      const screen = await openProfile(runtimeWithBiometrics(available));

      for (const group of ["profile-group-plan", "profile-group-settings", "profile-group-help"]) {
        expect(rowsOf(screen, group).length).toBeGreaterThan(1);
      }
      await cleanup();
      clearMobileQueryCache();
    }
  });

  it("opens Preguntas frecuentes on the studio's support page", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Preguntas frecuentes" }));

    expect(openURL.mock.calls).toEqual([["https://app.emmapilatesstudio.com/soporte"]]);
    openURL.mockRestore();
  });

  it("opens «Envíanos tu opinión» under the same title", async () => {
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Envíanos tu opinión" }));

    await waitFor(() => expect(screen.getByLabelText("Comentario")).toBeOnTheScreen());
    expect(screen.getByRole("header", { name: "Envíanos tu opinión" })).toBeOnTheScreen();
  });
});

describe("Client Perfil footer", () => {
  it("closes with «Cerrar sesión», then the version and the two links", async () => {
    const screen = await openProfile();

    const order = drawnOrder(screen.toJSON());
    const logout = order.indexOf("profile-logout");
    expect(logout).toBeGreaterThan(order.indexOf("profile-group-help"));
    expect(order.indexOf("profile-footer")).toBeGreaterThan(logout);
    const footer = within(screen.getByTestId("profile-footer"));
    expect(footer.getByText("Emma Pilates Studio · versión 1.0.1")).toHaveStyle({
      color: "#8A5B57",
      fontSize: 12,
    });
    expect(footer.getByRole("link", { name: "Política de privacidad" })).toBeOnTheScreen();
    expect(footer.getByRole("link", { name: "Cerrar mi cuenta" })).toBeOnTheScreen();
    // The privacy policy is no longer a row.
    expect(screen.queryByRole("button", { name: "Política de privacidad" })).toBeNull();
  });

  it("opens the privacy policy and «Cerrar mi cuenta» from the footer", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("link", { name: "Política de privacidad" }));
    expect(openURL.mock.calls).toEqual([["https://app.emmapilatesstudio.com/privacidad"]]);
    openURL.mockRestore();

    await fireEvent.press(screen.getByRole("link", { name: "Cerrar mi cuenta" }));
    // C24 opens over Perfil.
    await waitFor(() => expect(screen.queryByTestId("profile-footer")).toBeNull());
  });
});

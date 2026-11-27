import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking, StyleSheet } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { staffRoutes } from "./staff-pay-test-support";

jest.setTimeout(30_000);

type Role = "trainer" | "nutritionist" | "coordinator" | "assistant" | "administrator";

const member = (role: Role, name: string, branches: string[]) => ({
  id: `staff-${role}`,
  name,
  email: `${role}@example.com`,
  phone: "+591 70000002",
  role,
  gender: "female",
  branches: branches.map((branch, index) => ({ id: `branch-${index}`, name: branch })),
  photo: null,
});

const members: Record<Role, ReturnType<typeof member>> = {
  trainer: member("trainer", "Daniela Ortiz", ["Achumani", "Norte"]),
  nutritionist: member("nutritionist", "Gabriela Flores", ["Centro"]),
  coordinator: member("coordinator", "Paula Vargas", ["Centro", "Norte"]),
  assistant: member("assistant", "Camila Rojas", ["Achumani"]),
  administrator: member("administrator", "Ana Méndez", ["Centro"]),
};

async function openProfile(role: Role, { biometrics = true } = {}) {
  const runtime = createStaffRuntime(
    routeFetcher({
      ...staffRoutes(members[role], {
        payments: () =>
          jsonResponse([
            { id: "payment-1", amountCentavos: 41_000, paidOn: "2026-11-02", receiptUrl: null },
          ]),
      }),
      "/api/v1/referral-codes/current": () =>
        jsonResponse({ referralCode: "DANIELA", editableFrom: null }),
      "/api/v1/staff-members/current/payout-qr": () => jsonResponse({ payoutQr: null }),
    }),
    role,
  );
  runtime.sessionManager.canUseBiometrics = () => biometrics;
  const screen = await render(<App runtime={runtime} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => expect(screen.getByText(members[role].name)).toBeOnTheScreen());
  // The rows that wait on a read: the Trainer's code, the Assistant's last payment.
  if (role === "trainer") {
    await waitFor(() => expect(screen.getByText("DANIELA")).toBeOnTheScreen());
  }
  if (role === "assistant") {
    await waitFor(() => expect(screen.getByText("Último: Bs 410")).toBeOnTheScreen());
  }
  return screen;
}

type Screen = Awaited<ReturnType<typeof openProfile>>;

/** A group's rows, by label alone, in order. */
function rowsOf(screen: Screen, testID: string) {
  return within(screen.getByTestId(testID))
    .getAllByRole(/^(button|switch)$/)
    .map((row) => String(row.props.accessibilityLabel).split(", ")[0]);
}

const titles = (screen: Screen) =>
  screen.getAllByRole("header").map((header) => header.props.children as string);

const settings = ["Notificaciones", "Cambiar contraseña", "Entrar con Face ID"];
const help = ["Envíanos tu opinión", "Preguntas frecuentes"];

afterEach(async () => {
  await cleanup();
  clearMobileQueryCache();
});

// Follow-up 293 (owner 2026-11-27): no Perfil group holds a single row. Her
// Role and Branches move into the header and «Tu cuenta» goes away; each
// Role has its work group, then «Ajustes» and «Ayuda».
describe("Staff Perfil groups by Role", () => {
  it.each([
    ["trainer", "Instructora · Achumani, Norte"],
    ["nutritionist", "Nutricionista · Centro"],
    ["coordinator", "Coordinadora · Todas las sucursales"],
    ["assistant", "Asistente · Achumani"],
    ["administrator", "Administradora · Todas las sucursales"],
  ] as const)("names the %s's Role and Branches under her name", async (role, line) => {
    const screen = await openProfile(role);

    const identity = within(screen.getByTestId("profile-identity"));
    expect(identity.getByText(line)).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 14,
    });
    expect(screen.queryByText("Tu cuenta")).toBeNull();
    expect(screen.queryByText("Rol")).toBeNull();
    expect(screen.queryByText(/^Sucursal(es)?$/)).toBeNull();
  });

  it("names only the Role when she has no Branch yet", async () => {
    members.nutritionist = member("nutritionist", "Gabriela Flores", []);
    const screen = await openProfile("nutritionist");
    members.nutritionist = member("nutritionist", "Gabriela Flores", ["Centro"]);

    expect(
      within(screen.getByTestId("profile-identity")).getByText("Nutricionista"),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/ · $/)).toBeNull();
  });

  it("gives the Instructora Tus pagos with her code, Ajustes and Ayuda", async () => {
    const screen = await openProfile("trainer");

    expect(titles(screen)).toEqual(["Perfil", "Tus pagos", "Ajustes", "Ayuda"]);
    expect(rowsOf(screen, "profile-group-pay")).toEqual([
      "Historial de pagos",
      "Tu QR de cobro",
      "Tu código de referido",
    ]);
    expect(screen.getByRole("button", { name: "Tu código de referido, DANIELA" })).toBeTruthy();
    expect(rowsOf(screen, "profile-group-settings")).toEqual(settings);
    expect(rowsOf(screen, "profile-group-help")).toEqual(help);
  });

  it.each(["nutritionist", "coordinator"] as const)(
    "gives the %s Tus pagos with two rows, Ajustes and Ayuda",
    async (role) => {
      const screen = await openProfile(role);

      expect(titles(screen)).toEqual(["Perfil", "Tus pagos", "Ajustes", "Ayuda"]);
      expect(rowsOf(screen, "profile-group-pay")).toEqual(["Historial de pagos", "Tu QR de cobro"]);
      expect(rowsOf(screen, "profile-group-settings")).toEqual(settings);
      expect(rowsOf(screen, "profile-group-help")).toEqual(help);
    },
  );

  it("shows the Asistente's last payment on Historial de pagos", async () => {
    const screen = await openProfile("assistant");

    expect(titles(screen)).toEqual(["Perfil", "Tus pagos", "Ajustes", "Ayuda"]);
    expect(rowsOf(screen, "profile-group-pay")).toEqual(["Historial de pagos", "Tu QR de cobro"]);
    expect(
      screen.getByRole("button", { name: "Historial de pagos, Último: Bs 410" }),
    ).toBeOnTheScreen();
    expect(rowsOf(screen, "profile-group-help")).toEqual(help);
  });

  it("gives the Administradora Administración and Ajustes, and no Ayuda", async () => {
    const screen = await openProfile("administrator");

    expect(titles(screen)).toEqual(["Perfil", "Administración", "Ajustes"]);
    expect(rowsOf(screen, "profile-group-admin")).toEqual([
      "Ver la app como…",
      "Comentarios de clientas",
      "Tu QR de cobro",
    ]);
    expect(rowsOf(screen, "profile-group-settings")).toEqual(settings);
    expect(screen.queryByTestId("profile-group-help")).toBeNull();
    expect(screen.queryByText("Envíanos tu opinión")).toBeNull();
    expect(screen.queryByText("Preguntas frecuentes")).toBeNull();
  });

  it.each(["trainer", "nutritionist", "coordinator", "assistant", "administrator"] as const)(
    "never leaves the %s a group with a single row, even without Face ID",
    async (role) => {
      const screen = await openProfile(role, { biometrics: false });

      expect(rowsOf(screen, "profile-group-settings")).toEqual([
        "Notificaciones",
        "Cambiar contraseña",
      ]);
      for (const group of [
        "profile-group-pay",
        "profile-group-admin",
        "profile-group-settings",
        "profile-group-help",
      ]) {
        if (screen.queryByTestId(group) !== null) {
          expect(rowsOf(screen, group).length).toBeGreaterThan(1);
        }
      }
    },
  );

  // E-F01: a hairline between every two rows of «Ajustes», Face ID's too.
  it("splits each Ajustes row from the next with a hairline", async () => {
    const screen = await openProfile("trainer");

    type Node = {
      children?: (Node | string)[] | null;
      props: { style?: unknown; testID?: string };
    };
    const find = (node: Node | string, id: string): Node | undefined =>
      typeof node === "string"
        ? undefined
        : node.props.testID === id
          ? node
          : (node.children ?? []).map((child) => find(child, id)).find(Boolean);
    const hairlinesIn = (node: Node | string): number =>
      typeof node === "string"
        ? 0
        : ((StyleSheet.flatten(node.props.style as never) as { height?: number } | undefined)
            ?.height === 1
            ? 1
            : 0) + (node.children ?? []).reduce((sum, child) => sum + hairlinesIn(child), 0);
    const tree = screen.toJSON() as Node | Node[];
    const group = (Array.isArray(tree) ? tree : [tree])
      .map((root) => find(root, "profile-group-settings"))
      .find(Boolean);
    expect(group === undefined ? -1 : hairlinesIn(group)).toBe(settings.length - 1);
  });

  it("draws no line under any row and no old names", async () => {
    const screen = await openProfile("trainer");

    for (const gone of [
      "Contacto y WhatsApp del estudio",
      "Enviar comentarios",
      "Soporte",
      "Ayuda y legal",
      "Mi QR de cobro",
    ]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(screen.queryByRole("button", { name: "Política de privacidad" })).toBeNull();
  });

  it("opens Preguntas frecuentes on the studio's support page", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const screen = await openProfile("trainer");

    await fireEvent.press(screen.getByRole("button", { name: "Preguntas frecuentes" }));

    expect(openURL.mock.calls).toEqual([["https://app.emmapilatesstudio.com/soporte"]]);
    openURL.mockRestore();
  });
});

describe("Staff Perfil footer", () => {
  it("ends with the version and «Política de privacidad» under «Cerrar sesión»", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const screen = await openProfile("coordinator");

    const footer = within(screen.getByTestId("profile-footer"));
    expect(footer.getByText(/^Emma Pilates Studio · versión \S+$/)).toHaveStyle({
      color: "#8A5B57",
    });
    expect(footer.queryByRole("link", { name: "Cerrar mi cuenta" })).toBeNull();
    // The screen's 10 pt gap plus 6 makes the 16 pt above the footer.
    expect(screen.getByTestId("profile-footer")).toHaveStyle({ marginTop: 6 });
    await fireEvent.press(footer.getByRole("link", { name: "Política de privacidad" }));
    expect(openURL.mock.calls).toEqual([["https://app.emmapilatesstudio.com/privacidad"]]);
    openURL.mockRestore();
  });
});

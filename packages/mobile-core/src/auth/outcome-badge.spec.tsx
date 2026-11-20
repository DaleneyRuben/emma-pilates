import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { EmailChangeLinkScreen } from "../account/email-change-link-screen";
import { colors } from "../ui/tokens";
import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

type Screen = Awaited<ReturnType<typeof render>>;
type Inspection = Awaited<ReturnType<AuthenticationApi["inspectLink"]>>;

const api = (inspection?: Inspection) =>
  ({
    activateAccount: jest.fn().mockResolvedValue({ status: "activated" }),
    inspectLink: jest.fn().mockResolvedValue(inspection),
    requestPasswordRecovery: jest.fn().mockResolvedValue({ status: "accepted" }),
  }) as unknown as AuthenticationApi;

const hidden = { includeHiddenElements: true };

// MOB-035, Rosa Emma: the outcome frames draw a 72 pt disc over a centred
// title. On the client band a done or sent outcome is a solid 600 disc with a
// white glyph and a dead link a white disc; the staff card draws a 50 disc.
const expectBadge = (
  screen: Screen,
  surface: "solid" | "white" | "soft",
  icon: string,
  title: string,
) => {
  const disc = screen.getByTestId("outcome-badge", hidden);
  expect(disc).toHaveStyle({ borderRadius: 36, height: 72, width: 72 });
  expect(disc).toHaveStyle({
    backgroundColor: { solid: colors.emphasis, white: colors.card, soft: "#FEF6F2" }[surface],
  });
  const drawn = screen.getByTestId(`outcome-icon-${icon}`, hidden);
  expect(drawn).toHaveProp("stroke", surface === "solid" ? colors.onEmphasis : colors.text);
  expect(drawn).toHaveProp("width", 32);
  expect(screen.getByText(title)).toHaveStyle({ textAlign: "center" });
};

describe("The outcome badge (MOB-035)", () => {
  it.each([false, true])(
    "draws the success check on «Revisa tu correo» (staff: %s)",
    async (staff) => {
      const screen = await render(
        <AuthenticationFlow allowClientRegistration={!staff} api={api()} />,
      );
      await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
      await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));

      await screen.findByText("Revisa tu correo");
      expectBadge(screen, staff ? "soft" : "solid", "check", "Revisa tu correo");
    },
  );

  it("draws the success check once the account is active (21, S19)", async () => {
    const screen = await render(
      <AuthenticationFlow
        api={api({ purpose: "activation", status: "current" })}
        intent={{ token: "link-token", type: "activate-account" }}
      />,
    );
    await fireEvent.changeText(await screen.findByLabelText("Contraseña nueva"), "pilates2026");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar cuenta" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Activar cuenta" }));

    await screen.findByText("Tu cuenta está activa");
    expectBadge(screen, "solid", "check", "Tu cuenta está activa");
  });

  it.each([
    ["activate-account", "activation", "expired", "Este enlace ya no es válido"],
    ["activate-account", "activation", "removed", "Esta invitación ya no está activa"],
    ["recover-password", "password_recovery", "expired", "Este enlace ya no es válido"],
  ] as const)(
    "draws the Palo de rosa clock on a dead %s link (%s, %s)",
    async (type, purpose, status, title) => {
      const screen = await render(
        <AuthenticationFlow
          api={api({ purpose, status } as Inspection)}
          intent={{ token: "link-token", type }}
        />,
      );

      await screen.findByText(title);
      expectBadge(screen, "white", "clock", title);
    },
  );

  it.each([
    [null, "mail", "Confirmando tu correo", "solid"],
    ["changed", "check", "Tu correo cambió", "solid"],
    ["expired", "clock", "Enlace vencido", "white"],
    ["invalid", "blocked", "Enlace no válido", "white"],
    ["email_unavailable", "at", "Correo no disponible", "white"],
  ] as const)("draws 22's %s outcome with its icon", async (status, icon, title, surface) => {
    const completeEmailChange =
      status === null
        ? () => new Promise<never>(() => undefined)
        : jest.fn().mockResolvedValue({ status });
    const screen = await render(
      <EmailChangeLinkScreen api={{ completeEmailChange }} onDone={jest.fn()} token="t" />,
    );

    await screen.findByText(title);
    expectBadge(screen, surface, icon, title);
    expect(screen.getByText("Emma Pilates Studio")).toBeOnTheScreen();
  });
});

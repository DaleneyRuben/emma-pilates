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

// MOB-035: the outcome frames of 20, 21, 22, S18, S19 draw a 76 pt badge over
// a centred title: a sage check for success, a Palo de rosa icon otherwise.
const expectBadge = (screen: Screen, tone: "success" | "primary", icon: string, title: string) => {
  expect(screen.getByTestId("outcome-badge", hidden)).toHaveStyle({
    backgroundColor: tone === "success" ? colors.successTint : colors.primaryWash,
    borderRadius: 38,
    height: 76,
    width: 76,
  });
  const drawn = screen.getByTestId(`outcome-icon-${icon}`, hidden);
  expect(drawn).toHaveProp("stroke", tone === "success" ? colors.success : colors.primary);
  expect(drawn).toHaveProp("width", 34);
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
      expectBadge(screen, "success", "check", "Revisa tu correo");
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
    expectBadge(screen, "success", "check", "Tu cuenta está activa");
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
      expectBadge(screen, "primary", "clock", title);
    },
  );

  it.each([
    [null, "mail", "Confirmando tu correo", "primary"],
    ["changed", "check", "Tu correo cambió", "success"],
    ["expired", "clock", "Enlace vencido", "primary"],
    ["invalid", "blocked", "Enlace no válido", "primary"],
    ["email_unavailable", "at", "Correo no disponible", "primary"],
  ] as const)("draws 22's %s outcome with its icon", async (status, icon, title, tone) => {
    const completeEmailChange =
      status === null
        ? () => new Promise<never>(() => undefined)
        : jest.fn().mockResolvedValue({ status });
    const screen = await render(
      <EmailChangeLinkScreen api={{ completeEmailChange }} onDone={jest.fn()} token="t" />,
    );

    await screen.findByText(title);
    expectBadge(screen, tone, icon, title);
    expect(screen.getByText("Emma")).toBeOnTheScreen();
  });
});

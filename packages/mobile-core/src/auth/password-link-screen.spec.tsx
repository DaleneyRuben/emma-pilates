import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

type Inspection = Awaited<ReturnType<AuthenticationApi["inspectLink"]>>;

function createApiMock(
  inspection: Inspection,
  overrides: Partial<AuthenticationApi> = {},
): AuthenticationApi {
  return {
    activateAccount: jest.fn().mockResolvedValue({ status: "activated" }),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest
      .fn()
      .mockResolvedValue({ credential: "credential", status: "recovered" }),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn().mockResolvedValue(inspection),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

async function openLink(
  api: AuthenticationApi,
  type: "activate-account" | "recover-password",
  options: { onRecoveryCredential?: jest.Mock; staff?: boolean } = {},
) {
  const screen = await render(
    <AuthenticationFlow
      allowClientRegistration={!options.staff}
      api={api}
      intent={{ token: "link-token", type }}
      onRecoveryCredential={options.onRecoveryCredential}
    />,
  );
  await waitFor(() => expect(api.inspectLink).toHaveBeenCalled());
  return screen;
}

async function typePasswords(
  screen: Awaited<ReturnType<typeof openLink>>,
  password: string,
  confirmation: string,
) {
  await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), password);
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), confirmation);
}

describe("Crear contraseña (21, S19)", () => {
  it("activates an invitation and confirms before going to Login", async () => {
    const api = createApiMock({ purpose: "activation", status: "current" });
    const screen = await openLink(api, "activate-account");

    expect(await screen.findByText("Crea tu contraseña")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Elegir tu contraseña activa tu cuenta y confirma tu correo. Luego inicias sesión con ella.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Repite la contraseña")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toBeDisabled();

    await typePasswords(screen, "pilates2026", "pilates202");
    expect(
      await screen.findByRole("alert", { name: "Las contraseñas no coinciden." }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toBeDisabled();

    await typePasswords(screen, "pilates2026", "pilates2026");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar cuenta" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(await screen.findByText("Tu cuenta está activa")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Tu correo quedó verificado. Inicia sesión con tu correo y la contraseña que acabas de crear.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ir a iniciar sesión" }));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("saves a recovered password and hands over the new credential", async () => {
    const onRecoveryCredential = jest.fn();
    const api = createApiMock({ purpose: "password_recovery", status: "current" });
    const screen = await openLink(api, "recover-password", { onRecoveryCredential });

    expect(await screen.findByText("Crea una contraseña nueva")).toBeOnTheScreen();
    expect(screen.getByText("Elige una contraseña nueva para tu cuenta.")).toBeOnTheScreen();
    await typePasswords(screen, "pilates2026", "pilates2026");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar contraseña" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(onRecoveryCredential).toHaveBeenCalledWith("credential"));
  });

  it.each([
    [
      false,
      "Las invitaciones vencen a los 7 días y sirven una sola vez. Pide en el estudio que te envíen una nueva.",
    ],
    [
      true,
      "Las invitaciones vencen a los 7 días y sirven una sola vez. Pide a administración que te envíe una nueva.",
    ],
  ])("explains an expired invitation (staff %s)", async (staff, explanation) => {
    const api = createApiMock({ purpose: "activation", status: "expired" });
    const screen = await openLink(api, "activate-account", { staff });

    expect(await screen.findByText("Este enlace ya no es válido")).toBeOnTheScreen();
    expect(screen.getByText(explanation)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ir a iniciar sesión" })).toBeOnTheScreen();
  });

  it.each([
    [
      false,
      "Pasaron 30 días sin activarla, así que se eliminó. Para tener una cuenta, el estudio tiene que crear una invitación nueva.",
    ],
    [
      true,
      "Pasaron 30 días sin activarla, así que se eliminó. Para tener una cuenta, administración tiene que crear una invitación nueva.",
    ],
  ])("explains a removed invitation (staff %s)", async (staff, explanation) => {
    const api = createApiMock({ purpose: "activation", status: "removed" });
    const screen = await openLink(api, "activate-account", { staff });

    expect(await screen.findByText("Esta invitación ya no está activa")).toBeOnTheScreen();
    expect(screen.getByText(explanation)).toBeOnTheScreen();
  });

  it("sends an expired recovery link back to the recovery request", async () => {
    const api = createApiMock({ purpose: "password_recovery", status: "expired" });
    const screen = await openLink(api, "recover-password");

    expect(await screen.findByText("Este enlace ya no es válido")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Los enlaces para restablecer la contraseña vencen a los 30 minutos y sirven una sola vez. Pide uno nuevo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Volver a iniciar sesión" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Pedir un enlace nuevo" }));

    expect(
      screen.getByText("Te enviaremos un enlace para restablecer tu contraseña."),
    ).toBeOnTheScreen();
  });
});

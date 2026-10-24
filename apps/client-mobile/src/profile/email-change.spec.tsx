import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Keyboard } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, profile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const pending = {
  email: "sofia.nueva@example.com",
  requestedAt: "2026-09-24T15:00:00.000Z",
  expiresAt: "2026-09-25T15:00:00.000Z",
};
const changeLink =
  "https://links.emmapilates.test/client/authentication/confirm-email-change?token=change-secret";

async function openEditProfile(runtime: ReturnType<typeof createClientRuntime>) {
  const screen = await openProfile(runtime);
  await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
  await waitFor(() => {
    expect(screen.getByText("Editar perfil")).toBeOnTheScreen();
  });
  return screen;
}

describe("Client email change", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("asks to change the email on save and shows the pending state with resend and cancel", async () => {
    const calls: string[] = [];
    let current: typeof pending | null = null;
    const screen = await openEditProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/accounts/current/email-change": () => jsonResponse({ pending: current }),
          "POST /api/v1/accounts/current/email-change": (init) => {
            calls.push(`request ${JSON.parse(String(init?.body)).email}`);
            current = pending;
            return jsonResponse({ status: "verification_required", email: pending.email }, 202);
          },
          "PATCH /api/v1/clients/current": (init) => {
            calls.push(`patch ${String(init?.body)}`);
            return jsonResponse(profile);
          },
          "POST /api/v1/accounts/current/email-change/resends": () => {
            calls.push("resend");
            return jsonResponse({ status: "verification_required" }, 202);
          },
          "DELETE /api/v1/accounts/current/email-change": () => {
            calls.push("cancel");
            current = null;
            return new Response(null, { status: 204 });
          },
        }),
      ),
    );

    expect(screen.getByLabelText("Correo electrónico")).not.toHaveProp("editable", false);
    // MOB-070: a number that is not a Bolivian mobile is refused before the save.
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+54 9 11 1234 5678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(
      screen.getByText("Escribe un celular de Bolivia, por ejemplo +591 71234567."),
    ).toBeOnTheScreen();
    expect(calls).toEqual([]);
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+591 70011004");
    expect(
      screen.queryByText("Para cambiar tu correo, escríbenos al estudio."),
    ).not.toBeOnTheScreen();

    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "Sofia.Nueva@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(screen.getByText("Revisa tu correo nuevo")).toBeOnTheScreen();
    });
    // Follow-up 70: the pending card's title and links read on the tint.
    expect(screen.getByText("Revisa tu correo nuevo")).toHaveStyle({ color: "#7A4F4B" });
    expect(screen.getByText("Reenviar correo")).toHaveStyle({ color: "#7A4F4B" });
    // The card sits under the fields: the keyboard must not hide it.
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
    expect(calls).toEqual([
      `patch ${JSON.stringify({ name: "Sofía Guzmán", phone: "+591 70011004" })}`,
      "request Sofia.Nueva@example.com",
    ]);
    expect(screen.getByText(/sofia\.nueva@example\.com/)).toBeOnTheScreen();
    expect(screen.getByText(/24 horas/)).toBeOnTheScreen();
    // The current address stays the login until the link is opened.
    expect(screen.getByLabelText("Correo electrónico")).toHaveProp("value", "sofia@example.com");
    expect(screen.getByText("Editar perfil")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));
    await waitFor(() => {
      expect(calls).toContain("resend");
    });
    expect(screen.getByText("Te enviamos otro enlace.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar cambio" }));
    await waitFor(() => {
      expect(calls).toContain("cancel");
      expect(screen.queryByText("Revisa tu correo nuevo")).not.toBeOnTheScreen();
    });
  });

  it("saves name and phone only when the email did not change", async () => {
    const calls: string[] = [];
    const screen = await openEditProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/accounts/current/email-change": () => jsonResponse({ pending: null }),
          "POST /api/v1/accounts/current/email-change": () => {
            calls.push("request");
            return jsonResponse({}, 202);
          },
          "PATCH /api/v1/clients/current": () => {
            calls.push("patch");
            return jsonResponse(profile);
          },
        }),
      ),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(screen.queryByText("Editar perfil")).not.toBeOnTheScreen();
    });
    expect(calls).toEqual(["patch"]);
  });

  it("confirms the change from the link while signed in and refreshes the profile", async () => {
    let email = "sofia@example.com";
    const runtime = createClientRuntime(
      routeFetcher({
        ...readRoutes,
        "/api/v1/clients/current": () => jsonResponse({ ...profile, email }),
      }),
    );
    runtime.linkSource.getInitialURL = async () => changeLink;
    runtime.authenticationApi.completeEmailChange = jest.fn(async () => {
      email = "sofia.nueva@example.com";
      return { status: "changed" as const };
    });
    const screen = await render(<App runtime={runtime} />);

    await waitFor(
      () => {
        expect(screen.getByText("Tu correo cambió")).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    expect(runtime.authenticationApi.completeEmailChange).toHaveBeenCalledWith("change-secret");

    await fireEvent.press(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
    await waitFor(() => {
      expect(screen.getByText("sofia.nueva@example.com")).toBeOnTheScreen();
    });
  });

  it("confirms the change from the link while signed out and returns to Login", async () => {
    const runtime = createClientRuntime(routeFetcher(readRoutes));
    runtime.sessionManager.restore.mockResolvedValue(null);
    runtime.linkSource.getInitialURL = async () => changeLink;
    runtime.authenticationApi.completeEmailChange = jest
      .fn()
      .mockResolvedValue({ status: "expired" });
    const screen = await render(<App runtime={runtime} />);

    await waitFor(
      () => {
        expect(screen.getByText("Enlace vencido")).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByText("Iniciar sesión")).toBeOnTheScreen();
    });
  });
});

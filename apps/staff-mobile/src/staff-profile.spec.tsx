import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Alert } from "react-native";

import App from "../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const trainerProfile = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: "+591 707 45210",
  role: "trainer",
  branches: [
    { id: "branch-1", name: "Centro" },
    { id: "branch-2", name: "Equipetrol" },
  ],
};

const administratorProfile = {
  ...trainerProfile,
  id: "staff-2",
  name: "María Fernanda Loza",
  email: "mfloza@example.com",
  role: "administrator",
  branches: [],
};

function staffRoutes(profile: unknown, unread = 0) {
  return {
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread }),
    "/api/v1/notifications": () =>
      jsonResponse({ items: [], hasMore: false, nextCursor: null }),
  };
}

async function openProfile(
  runtime = createStaffRuntime(routeFetcher(staffRoutes(trainerProfile, 1))),
) {
  const screen = await render(<App runtime={runtime} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await waitFor(() => {
    expect(screen.getByText("EV")).toBeOnTheScreen();
  });
  fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
  await waitFor(() => {
    expect(screen.getByText("Emma Vargas")).toBeOnTheScreen();
  });

  return screen;
}

describe("Staff Perfil", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("opens a read-only profile from the account avatar", async () => {
    const screen = await openProfile();

    expect(screen.getByText("emma.vargas@example.com")).toBeOnTheScreen();
    expect(screen.getByText("+591 707 45210")).toBeOnTheScreen();
    expect(
      screen.getByText("Tus datos los actualiza administración."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Rol")).toBeOnTheScreen();
    expect(screen.getByText("Entrenadora")).toBeOnTheScreen();
    expect(screen.getByText("Sucursales")).toBeOnTheScreen();
    expect(screen.getByText("Centro, Equipetrol")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Notificaciones" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Emma Pilates Studio · versión 1.0"),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Mi agenda")).toBeOnTheScreen();
    });
  });

  it("shows every branch for an Administrator", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher(staffRoutes(administratorProfile)),
          "administrator",
        )}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText("MF")).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));

    await waitFor(() => {
      expect(screen.getByText("Administración")).toBeOnTheScreen();
    });
    expect(screen.getByText("Todas las sucursales")).toBeOnTheScreen();
  });

  it("opens the staff inbox with its own empty state", async () => {
    const screen = await openProfile();

    fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));

    await waitFor(() => {
      expect(screen.getByText("No tienes notificaciones.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Te avisaremos aquí cuando haya algo que necesite tu atención.",
      ),
    ).toBeOnTheScreen();
  });

  it("opens the change password step", async () => {
    const screen = await openProfile();

    fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Contraseña actual")).toBeOnTheScreen();
    });
  });

  it("asks for confirmation before logging out", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const runtime = createStaffRuntime(
      routeFetcher(staffRoutes(trainerProfile, 1)),
    );
    const screen = await openProfile(runtime);

    fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(alert).toHaveBeenCalledWith(
      "¿Cerrar sesión?",
      expect.any(String),
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2] as {
      text?: string;
      onPress?: () => void;
    }[];
    buttons.find((button) => button.text === "Cerrar sesión")?.onPress?.();

    await waitFor(() => {
      expect(runtime.sessionManager.logout).toHaveBeenCalled();
    });
    alert.mockRestore();
  });
});

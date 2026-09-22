import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Alert } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const profile = {
  id: "client-1",
  name: "Sofía Guzmán",
  email: "sofia@example.com",
  phone: "+591 70011004",
  referralCode: "REF-SOFIA",
};

const expired = {
  status: "expired",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 3,
    startsOn: "2026-08-12",
    endsOn: "2026-09-11",
  },
};

const readRoutes = {
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () => jsonResponse(expired),
};

const notificationRoutes = {
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
  "/api/v1/notifications?limit=50": () =>
    jsonResponse({
      items: [
        {
          id: "n1",
          category: "booking_schedule",
          type: "session_cancelled",
          title: "Clase cancelada",
          message: "Tu clase de Reformer Pilates fue cancelada.",
          destinationType: "session",
          destinationId: "session-1",
          createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
          readAt: null,
        },
        {
          id: "n2",
          category: "subscription_payment",
          type: "subscription_expiring",
          title: "Tu plan vence pronto",
          message: "Tu plan vence en 3 días.",
          destinationType: "subscription",
          destinationId: "subscription-1",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
          readAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
        },
      ],
      hasMore: false,
      nextCursor: null,
    }),
};

async function openProfile(
  runtime = createClientRuntime(routeFetcher(readRoutes)),
) {
  const screen = await render(<App runtime={runtime} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  await waitFor(
    () => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );

  return screen;
}

describe("Client Profile", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows the account summary and the Plan status row", async () => {
    const screen = await openProfile();

    expect(screen.getByText("sofia@example.com")).toBeOnTheScreen();
    expect(screen.getByText("+591 70011004")).toBeOnTheScreen();
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeOnTheScreen();
  });

  it("opens the expired Plan detail with a purchase action", async () => {
    const screen = await openProfile();

    fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));

    await waitFor(() => {
      expect(screen.getByText("Último plan")).toBeOnTheScreen();
    });
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Comprar un plan" }),
    ).toBeOnTheScreen();
  });

  it("asks for confirmation before logging out", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const runtime = createClientRuntime(routeFetcher(readRoutes));
    const screen = await openProfile(runtime);

    fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(alert).toHaveBeenCalledWith(
      "¿Cerrar sesión?",
      expect.any(String),
      expect.any(Array),
    );
    expect(runtime.sessionManager.logout).not.toHaveBeenCalled();
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

  it("shows the unread count on the Notificaciones row and opens the inbox", async () => {
    const screen = await openProfile(
      createClientRuntime(routeFetcher({ ...readRoutes, ...notificationRoutes })),
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Emma Pilates Studio · versión 1.0"),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));

    await waitFor(() => {
      expect(screen.getByText("Sin leer")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Tu clase de Reformer Pilates fue cancelada."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Tu plan vence en 3 días.")).toBeOnTheScreen();
  });

  it("opens the change password step from Perfil", async () => {
    const screen = await openProfile();

    fireEvent.press(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Contraseña actual")).toBeOnTheScreen();
    });
    expect(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    ).toBeOnTheScreen();
  });

  it("edits the name and phone and keeps the email read-only", async () => {
    const saved = jest.fn();
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "PATCH /api/v1/clients/current": (init) => {
            saved(JSON.parse(String(init?.body)));
            return jsonResponse({
              ...profile,
              name: "Sofía Guzmán Vega",
              phone: null,
            });
          },
        }),
      ),
    );

    fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => {
      expect(screen.getByText("Editar perfil")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Nombre")).toHaveProp(
      "value",
      "Sofía Guzmán",
    );
    expect(screen.getByLabelText("Correo electrónico")).toHaveProp(
      "editable",
      false,
    );

    fireEvent.changeText(screen.getByLabelText("Nombre"), "Sofía Guzmán Vega");
    fireEvent.changeText(screen.getByLabelText("Teléfono"), "");
    fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(saved).toHaveBeenCalledWith({
        name: "Sofía Guzmán Vega",
        phone: null,
      });
      expect(screen.getByText("Sofía Guzmán Vega")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Editar perfil")).not.toBeOnTheScreen();
  });
});

import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

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

async function openProfile(
  routes: Parameters<typeof routeFetcher>[0],
  runtime = createClientRuntime(routeFetcher(routes)),
) {
  const screen = await render(<App runtime={runtime} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Perfil" })).toBeOnTheScreen();
  });
  fireEvent.press(screen.getByRole("button", { name: "Perfil" }));
  await waitFor(() => {
    expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
  });

  return screen;
}

describe("Client Profile", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows the account summary and the Plan status row", async () => {
    const screen = await openProfile({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(expired),
    });

    expect(screen.getByText("sofia@example.com")).toBeOnTheScreen();
    expect(screen.getByText("+591 70011004")).toBeOnTheScreen();
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeOnTheScreen();
  });

  it("opens the expired Plan detail with a purchase action", async () => {
    const screen = await openProfile({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(expired),
    });

    fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));

    await waitFor(() => {
      expect(screen.getByText("Último plan")).toBeOnTheScreen();
    });
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Comprar un plan" }),
    ).toBeOnTheScreen();
  });

  it("edits the name and phone and keeps the email read-only", async () => {
    const saved = jest.fn();
    const screen = await openProfile({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(expired),
      "PATCH /api/v1/clients/current": (init) => {
        saved(JSON.parse(String(init?.body)));
        return jsonResponse({
          ...profile,
          name: "Sofía Guzmán Vega",
          phone: null,
        });
      },
    });

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

  it("logs out from the profile", async () => {
    const runtime = createClientRuntime(
      routeFetcher({
        "/api/v1/clients/current": () => jsonResponse(profile),
        "/api/v1/clients/current/subscription": () => jsonResponse(expired),
      }),
    );
    const screen = await openProfile({}, runtime);

    fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => {
      expect(runtime.sessionManager.logout).toHaveBeenCalled();
    });
  });
});

import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, invitation, newClient, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

const overviewRoutes = {
  "/api/v1/assistant/clients/client-new": () =>
    jsonResponse({
      client: newClient,
      subscription: { status: "none", subscription: null },
      nextBooking: null,
      recentHistory: [],
      creditAvailableCentavos: 0,
    }),
  "/api/v1/assistant/client-invitations/client-new": () => jsonResponse(invitation),
};

async function openForm(screen: Awaited<ReturnType<typeof openClientSearch>>) {
  await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
  });
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
}

// BKM-011 (follow-up 141): S05 asks «¿Cómo nos conociste?» and the optional code.
describe("Assistant new Client acquisition (S05)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("sends the channel and the code the Client gave", async () => {
    const invited = jest.fn();
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": (init) => {
        invited(JSON.parse(String(init?.body)));
        return jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        );
      },
    });

    await openForm(screen);
    await fireEvent.press(screen.getByRole("radio", { name: "Una instructora" }));
    await fireEvent.changeText(screen.getByLabelText("Código de referido (opcional)"), " carla ");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ana Nueva")).toBeOnTheScreen();
    });
    expect(invited).toHaveBeenCalledWith({
      name: "Ana Nueva",
      email: "ana@example.com",
      phone: null,
      acquisitionChannel: "trainer",
      referralCode: "carla",
    });
  });

  it("asks how she found the studio before creating anything", async () => {
    const invited = jest.fn();
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () => {
        invited();
        return jsonResponse({}, 500);
      },
    });

    await openForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByRole("alert", { name: "Elige cómo nos conociste." }),
    ).toBeOnTheScreen();
    expect(invited).not.toHaveBeenCalled();
  });

  it("points at a code nobody holds and keeps the form", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        new Response(JSON.stringify({ code: "referral_code_invalid", status: 400 }), {
          headers: { "Content-Type": "application/problem+json" },
          status: 400,
        }),
    });

    await openForm(screen);
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.changeText(screen.getByLabelText("Código de referido (opcional)"), "NADIE");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByRole("alert", {
        name: "No encontramos ese código. Revísalo o déjalo vacío.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Ana Nueva");
  });
});

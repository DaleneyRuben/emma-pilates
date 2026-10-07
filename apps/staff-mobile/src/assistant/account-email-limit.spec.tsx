import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, invitation, newClient, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

const accountLimit =
  "Enviaste muchos correos en poco tiempo. Espera un momento para enviar otro; los enlaces que ya enviaste siguen sirviendo.";

const accountLimited = () =>
  new Response(JSON.stringify({ code: "staff_email_throttled", status: 429 }), {
    headers: {
      "Content-Type": "application/problem+json",
      "Retry-After": "892",
    },
    status: 429,
  });

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

const invited = () =>
  jsonResponse({ status: "invited", clientId: "client-new", email: "ana@example.com" }, 201);

async function submitNewClient(screen: Awaited<ReturnType<typeof openClientSearch>>) {
  await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
  });
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("The staff Account's email limit (BE-013, follow-up 78)", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("keeps S05's form and says the limit is the Assistant's", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": accountLimited,
    });

    await submitNewClient(screen);

    expect(await screen.findByRole("alert", { name: accountLimit })).toBeOnTheScreen();
    expect(screen.getByText("Podrás intentarlo en 14:52.")).toBeOnTheScreen();
    expect(
      screen.getByTestId("wait-notice-clock", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toHaveDisplayValue("ana@example.com");
    expect(screen.queryByText("No pudimos crear la cuenta. Inténtalo de nuevo.")).toBeNull();
  });

  it("shows the Account limit on S06's resend instead of the recipient's", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": invited,
      "POST /api/v1/assistant/client-invitations/client-new/resends": accountLimited,
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Reenviar enlace" }));

    expect(await screen.findByRole("alert", { name: accountLimit })).toBeOnTheScreen();
    expect(screen.getByText("Podrás enviarlo en 14:52.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeDisabled();
    expect(
      screen.queryByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeNull();
  });

  it("keeps «Guardar correo» disabled while the Account waits", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": invited,
      "POST /api/v1/assistant/client-invitations/client-new/email-corrections": accountLimited,
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar correo" }));
    await fireEvent.changeText(screen.getByLabelText("Nuevo correo"), "ana.n@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar correo" }));

    expect(await screen.findByRole("alert", { name: accountLimit })).toBeOnTheScreen();
    expect(screen.getByText("Podrás enviarlo en 14:52.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Guardar correo" })).toBeDisabled();
  });

  it("shows the Account limit on a self-registered Client's verification link", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "verification_pending", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
      "POST /api/v1/assistant/client-invitations/client-new/verification-emails": accountLimited,
    });

    await submitNewClient(screen);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Enviar enlace de verificación" }),
    );

    expect(await screen.findByRole("alert", { name: accountLimit })).toBeOnTheScreen();
    expect(screen.getByText("Podrás enviarlo en 14:52.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar enlace de verificación" })).toBeDisabled();
    expect(screen.queryByText("No pudimos enviar el enlace. Inténtalo de nuevo.")).toBeNull();
  });
});

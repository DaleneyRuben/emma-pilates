import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, colors } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  invitation,
  newClient,
  openClientSearch,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const recipientLimit =
  "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.";

const limited = (code: string, retryAfter: number) =>
  new Response(JSON.stringify({ code, status: 429 }), {
    headers: {
      "Content-Type": "application/problem+json",
      "Retry-After": String(retryAfter),
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

const createdAs = (status: "invited" | "verification_pending") => () =>
  jsonResponse({ status, clientId: "client-new", email: "ana@example.com" }, 201);

async function submitNewClient(screen: Awaited<ReturnType<typeof openClientSearch>>) {
  await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
  });
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "ana@example.com",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
}

const expectCardNotice = (
  screen: Awaited<ReturnType<typeof openClientSearch>>,
  wait: string,
) => {
  expect(screen.getByTestId("wait-notice")).toHaveStyle({
    backgroundColor: colors.white,
  });
  expect(
    screen.getByTestId("wait-notice-clock", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText(wait)).toBeOnTheScreen();
};

describe("S06's pending cards under an email limit (MOB-037)", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws «Reenvío limitado» as the clock notice in the invitation card", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": createdAs("invited"),
      "POST /api/v1/assistant/client-invitations/client-new/resends": () =>
        limited("email_throttled", 40),
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Reenviar enlace" }));

    expect(await screen.findByRole("alert", { name: recipientLimit })).toBeOnTheScreen();
    expectCardNotice(screen, "Podrás reenviarlo en 0:40.");
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeDisabled();
  });

  it("draws «Verificación limitada» on S06 as the card's clock notice with a 48 pt button", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "/api/v1/assistant/client-invitations/client-new": () =>
        new Response(
          JSON.stringify({ code: "client_verification_pending", status: 404 }),
          { headers: { "Content-Type": "application/problem+json" }, status: 404 },
        ),
      "POST /api/v1/assistant/client-invitations": createdAs("verification_pending"),
      "POST /api/v1/assistant/client-invitations/client-new/verification-emails": () =>
        limited("email_throttled", 40),
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver cliente" }));
    await screen.findByLabelText("Ana Nueva");
    const send = await screen.findByRole("button", {
      name: "Enviar enlace de verificación",
    });
    expect(send).toHaveStyle({ minHeight: 48 });
    await fireEvent.press(send);

    expect(await screen.findByRole("alert", { name: recipientLimit })).toBeOnTheScreen();
    expectCardNotice(screen, "Podrás reenviarlo en 0:40.");
    expect(
      screen.getByRole("button", { name: "Enviar enlace de verificación" }),
    ).toBeDisabled();
  });

  it("keeps S05's verification offer on the screen's tinted notice and full button", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": createdAs("verification_pending"),
      "POST /api/v1/assistant/client-invitations/client-new/verification-emails": () =>
        limited("email_throttled", 40),
    });

    await submitNewClient(screen);
    const send = await screen.findByRole("button", {
      name: "Enviar enlace de verificación",
    });
    expect(send).toHaveStyle({ minHeight: 52 });
    await fireEvent.press(send);

    expect(await screen.findByRole("alert", { name: recipientLimit })).toBeOnTheScreen();
    expect(screen.getByTestId("wait-notice")).toHaveStyle({
      backgroundColor: colors.secondaryTint,
    });
    expect(screen.getByText("Podrás reenviarlo en 0:40.")).toBeOnTheScreen();
  });

  it("draws the Account limit on the card's white box too", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": createdAs("invited"),
      "POST /api/v1/assistant/client-invitations/client-new/resends": () =>
        limited("staff_email_throttled", 892),
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Reenviar enlace" }));

    await screen.findByText("Podrás enviarlo en 14:52.");
    expectCardNotice(screen, "Podrás enviarlo en 14:52.");
  });

  it("frames the invitation card as S06 draws it", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes,
      "POST /api/v1/assistant/client-invitations": createdAs("invited"),
    });

    await submitNewClient(screen);
    const title = await screen.findByText("Cuenta pendiente de activación");

    expect(screen.getByTestId("pending-card")).toHaveStyle({
      borderRadius: 16,
      gap: 12,
      padding: 18,
    });
    expect(title).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 19 });
  });
});

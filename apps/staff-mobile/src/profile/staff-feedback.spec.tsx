import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const trainer = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

// REL-012: «Enviar comentarios» on S23 for every Role.
describe("Staff «Enviar comentarios»", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("sends a comment from Perfil with the device details", async () => {
    const fetcher = routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([]),
      "/api/v1/staff-members/current": () => jsonResponse(trainer),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
      "POST /api/v1/feedback": () =>
        jsonResponse({ id: "feedback-1", createdAt: "2026-10-23T15:00:00.000Z" }, 201),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Tu cuenta/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /Tu cuenta/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enviar comentarios" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Enviar comentarios" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Comentario")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Sugerencia" }));
    await fireEvent.changeText(
      screen.getByLabelText("Comentario"),
      "Sería útil ver la lista de la clase siguiente.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Enviar comentario" }));

    await waitFor(() => {
      expect(screen.getByText("¡Gracias por tu comentario!")).toBeOnTheScreen();
    });
    const call = fetcher.mock.calls.find(([path]) => path === "/api/v1/feedback");
    const body = JSON.parse(String((call?.[1] as RequestInit).body)) as Record<string, string>;
    expect(body).toMatchObject({
      type: "suggestion",
      text: "Sería útil ver la lista de la clase siguiente.",
      platform: expect.stringMatching(/^(android|ios)$/) as string,
    });
    expect(body.appVersion).toEqual(expect.any(String));
    expect(body.appBuild).toEqual(expect.any(String));
    expect(body.osVersion).toEqual(expect.any(String));
  });
});

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

type Role = "assistant" | "trainer";

const profile = (role: Role) => ({
  id: "staff-1",
  name: "Daniela Rojas",
  email: "daniela@example.com",
  phone: null,
  role,
  branches: [{ id: "branch-1", name: "Centro" }],
});

const routes = (role: Role) =>
  routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(profile(role)),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/referral-codes/current": () =>
      jsonResponse({ referralCode: "DANIELA", editableFrom: null }),
  });

async function openProfile(role: Role) {
  const screen = await render(<App runtime={createStaffRuntime(routes(role), role)} />);
  await waitFor(
    () => {
      expect(screen.getByTestId("tab-profile")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() => {
    expect(screen.getByText("Daniela Rojas")).toBeOnTheScreen();
  });
  return screen;
}

// BKM-017 and follow-up 229: the Trainer's code has its own page (S30).
describe("Tu código de referido (S30)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens the Trainer's code from Perfil, copies it and offers to edit it", async () => {
    const screen = await openProfile("trainer");

    const row = await screen.findByRole("button", { name: "Tu código de referido, DANIELA" });
    await fireEvent.press(row);

    expect(await screen.findByText("Compartes tu código con tus alumnas")).toBeOnTheScreen();
    expect(screen.getByText("DANIELA")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByText("Código copiado")).toBeOnTheScreen();
    expect(await screen.findByRole("button", { name: "Editar código" })).toBeOnTheScreen();
  });

  it("shows no code row to other roles", async () => {
    const screen = await openProfile("assistant");

    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeOnTheScreen();
    expect(screen.queryByText("Tu código de referido")).toBeNull();
  });
});

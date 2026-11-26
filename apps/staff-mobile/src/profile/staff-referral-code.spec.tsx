import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { Share } from "react-native";
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

  // Walkthrough n.º 26 and 27 (E-F13, E-F21, E-F22): one card with the code,
  // copy, the native share sheet with the link, and «Editar código».
  it("opens the Trainer's code from Perfil, copies, shares and edits it in one card", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
    const screen = await openProfile("trainer");

    const row = await screen.findByRole("button", { name: "Tu código de referido, DANIELA" });
    await fireEvent.press(row);

    expect(
      await screen.findByText("Compartes tu código o tu enlace con tus clientas"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Ella instala la app y crea su cuenta con tu código"),
    ).toBeOnTheScreen();
    const card = within(screen.getByTestId("referral-code-card"));
    // A long code shrinks to one line instead of breaking (E-F21).
    expect(card.getByText("DANIELA")).toHaveProp("numberOfLines", 1);
    expect(card.getByText("DANIELA")).toHaveProp("adjustsFontSizeToFit", true);
    await fireEvent.press(card.getByRole("button", { name: "Copiar código" }));
    expect(await screen.findByText("Código copiado")).toBeOnTheScreen();
    expect(await card.findByRole("button", { name: "Editar código" })).toBeOnTheScreen();

    // E-F13: the share icon leads «Compartir tu código», as in the Client app.
    expect(
      within(card.getByRole("button", { name: "Compartir tu código" })).getByTestId("glyph-share", {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(card.getByRole("button", { name: "Compartir tu código" }));
    expect(share).toHaveBeenCalledWith({
      message:
        "Crea tu cuenta en Emma Pilates Studio con mi código DANIELA. https://links.emmapilatesstudio.com/client/invite/DANIELA",
    });
    share.mockRestore();
  });

  it("shows no code row to other roles", async () => {
    const screen = await openProfile("assistant");

    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeOnTheScreen();
    expect(screen.queryByText("Tu código de referido")).toBeNull();
  });
});

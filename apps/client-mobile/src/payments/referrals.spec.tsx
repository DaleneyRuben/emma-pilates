import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Share } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "LUCIA",
};

const routes = (referrals: unknown[]) => ({
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: 0, reservedCentavos: 0, activity: [] }),
  "/api/v1/clients/current/referrals": () => jsonResponse({ referralCode: "LUCIA", referrals }),
  "/api/v1/referral-codes/current": () =>
    jsonResponse({ referralCode: "LUCIA", editableFrom: null }),
});

async function openInvita(fetcher: ReturnType<typeof routeFetcher>) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Invita a una amiga" })).toBeOnTheScreen();
  });
  expect(screen.queryByText("Mi crédito")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Invita a una amiga" }));
  return screen;
}

describe("Invita a una amiga (BKM-014)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the referral code, shares it, and lists referred friends with their status", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
    const screen = await openInvita(
      routeFetcher(
        routes([
          {
            referredClientId: "client-2",
            referredName: "Sofía G.",
            state: "awarded",
            invitationStatus: "bought",
            createdAt: "2026-09-10T15:00:00.000Z",
            awardedAt: "2026-09-12T15:00:00.000Z",
            awardCentavos: null,
          },
          {
            referredClientId: "client-3",
            referredName: "Mariana P.",
            state: "pending",
            invitationStatus: "registered",
            createdAt: "2026-09-18T15:00:00.000Z",
            awardedAt: null,
            awardCentavos: null,
          },
        ]),
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("LUCIA")).toBeOnTheScreen();
    });
    expect(screen.getByText("Invita a una amiga")).toBeOnTheScreen();
    // Walkthrough n.º 10: the code readable, «Cómo funciona» in three steps.
    expect(screen.getByText("LUCIA")).toHaveProp("selectable", true);
    expect(screen.getByText("Cómo funciona")).toBeOnTheScreen();
    // FIX-082 (Invita option A): three plain lines, no numbered discs.
    expect(screen.getByText("1. Compartes tu código.")).toBeOnTheScreen();
    expect(screen.getByText("2. Tu amiga toma una clase gratis.")).toBeOnTheScreen();
    expect(screen.getByText("3. Si compra su primer plan, tú ganas una clase.")).toBeOnTheScreen();
    expect(
      screen.getByText("Una amiga por mes. La clase gratis es una sola vez para ella."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Tu crédito")).toBeNull();
    expect(screen.queryByText(/crédito/i)).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(screen.getByText("Tus invitadas")).toBeOnTheScreen();
    expect(screen.getByText("Sofía G.")).toBeOnTheScreen();
    expect(screen.getByText("Compró su plan")).toBeOnTheScreen();
    expect(screen.getByText("Mariana P.")).toBeOnTheScreen();
    expect(screen.getByText("Registrada")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Compartir tu código" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("LUCIA") }),
    );
    share.mockRestore();
  });

  // BKM-017: copy next to the code, and «Editar código» on the card. FIX-082
  // (Invita option A): one white card, the code in Lora, a 44 pt outlined copy
  // icon, «Compartir tu código» right under it and «Editar código» centred.
  it("holds the code, copy, share and edit on one light card", async () => {
    const screen = await openInvita(routeFetcher(routes([])));

    const card = await screen.findByTestId("referral-code-card");
    expect(card).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 20 });
    expect(screen.getByText("Tu código")).toBeOnTheScreen();
    expect(screen.getByText("LUCIA")).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_400Regular",
    });
    const copy = screen.getByRole("button", { name: "Copiar código" });
    expect(copy).toHaveStyle({ borderWidth: 1.5, height: 44, width: 44 });
    expect(screen.getAllByRole("button", { name: "Compartir tu código" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Compartir tu código" })).toHaveStyle({
      backgroundColor: "#93615D",
    });

    await fireEvent.press(copy);
    expect(await screen.findByText("Código copiado")).toBeOnTheScreen();
    expect(await screen.findByRole("button", { name: "Editar código" })).toBeOnTheScreen();
  });

  it("encourages inviting friends when nobody has been invited yet", async () => {
    const screen = await openInvita(routeFetcher(routes([])));

    await waitFor(() => {
      expect(screen.getByText("LUCIA")).toBeOnTheScreen();
    });
    // FIX-082: plain text, not a card with its own button.
    expect(
      screen.getByText("Aún no invitaste a nadie. Cuando una amiga use tu código, la verás aquí."),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Compartir tu código" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Compartir" })).toBeNull();
  });
});

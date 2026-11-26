import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions, Share, StyleSheet } from "react-native";

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

const routes = (referrals: unknown[], codeActive = true) => ({
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: 0, reservedCentavos: 0, activity: [] }),
  "/api/v1/clients/current/referrals": () =>
    jsonResponse({ referralCode: "LUCIA", codeActive, referrals }),
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
    // Owner, 26 Nov (C16): the shorter footnote.
    expect(screen.getByText("Puedes invitar a una amiga por mes.")).toBeOnTheScreen();
    expect(screen.queryByText("Tu crédito")).toBeNull();
    expect(screen.queryByText(/crédito/i)).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(screen.getByText("Tus invitadas")).toBeOnTheScreen();
    expect(screen.getByText("Sofía G.")).toBeOnTheScreen();
    expect(screen.getByText("Compró su plan")).toBeOnTheScreen();
    expect(screen.getByText("Mariana P.")).toBeOnTheScreen();
    expect(screen.getByText("Registrada")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Compartir tu código" }));
    // Walkthrough n.º 13 (C16g): the system's own share sheet, with the link.
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Únete a Emma Pilates Studio con mi código LUCIA: tu primera clase es gratis. https://links.emmapilatesstudio.com/client/invite/LUCIA",
      }),
    );
    share.mockRestore();
  });

  // Walkthrough n.º 20 (C16s): each friend's next step under her status.
  it("tells the host what comes next for each friend", async () => {
    const friend = (id: string, invitationStatus: string) => ({
      referredClientId: id,
      referredName: `Amiga ${id}`,
      state: invitationStatus === "bought" ? "awarded" : "pending",
      invitationStatus,
      createdAt: "2026-09-10T15:00:00.000Z",
      awardedAt: null,
      awardCentavos: null,
    });
    const screen = await openInvita(
      routeFetcher(
        routes([friend("1", "bought"), friend("2", "class_booked"), friend("3", "registered")]),
      ),
    );

    expect(await screen.findByText("Ganaste 1 clase. Ya está en tu plan.")).toBeOnTheScreen();
    expect(screen.getByText("Si compra su primer plan, ganas una clase.")).toBeOnTheScreen();
    expect(screen.getByText("Todavía no reservó su clase gratis.")).toBeOnTheScreen();
  });

  // Testing session (#20 + #22): a friend who registered while the code was
  // not active got no Guest Pass, so her row promises no free class.
  it("promises no free class to a friend who never got one", async () => {
    const screen = await openInvita(
      routeFetcher(
        routes([
          {
            referredClientId: "rosa",
            referredName: "Rosa A.",
            state: "pending",
            invitationStatus: "registered",
            freeClass: false,
            createdAt: "2026-09-10T15:00:00.000Z",
            awardedAt: null,
            awardCentavos: null,
          },
        ]),
      ),
    );

    expect(
      await screen.findByText("Tu código no estaba activo: no recibió la clase gratis."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Todavía no reservó su clase gratis.")).toBeNull();
  });

  // Walkthrough n.º 22 (C16h): without a paid Plan in force the code gives no
  // class yet, so the card asks for a Plan instead of sharing.
  it("asks a host without a paid Plan to buy one instead of sharing", async () => {
    const screen = await openInvita(routeFetcher(routes([], false)));

    expect(await screen.findByText("Se activa cuando compres un plan.")).toBeOnTheScreen();
    expect(screen.getByText("LUCIA")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Compartir tu código" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar código" })).toBeNull();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    // C16h: the deep-rose hero with a white «Comprar un plan», and no
    // «Tus invitadas» while there are none.
    expect(screen.getByTestId("referral-code-card")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toHaveStyle({
      alignSelf: "stretch",
      backgroundColor: "#FFFBFB",
    });
    expect(screen.queryByText("Tus invitadas")).toBeNull();
  });

  // BKM-017: copy next to the code, and «Editar código» on the card. FIX-082
  // (Invita option A): one white card, the code in Lora, a 44 pt outlined copy
  // icon, «Compartir tu código» right under it and «Editar código» centred.
  // C16, C16s, C16g (walkthrough 291): the deep-rose hero, like the Staff one.
  it("holds the code, copy, share and edit on one deep-rose card", async () => {
    const screen = await openInvita(routeFetcher(routes([])));

    const card = await screen.findByTestId("referral-code-card");
    expect(card).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 24 });
    expect(screen.getByText("Tu código")).toBeOnTheScreen();
    // Follow-up 285: the code is `cifra-grande`, with no hand-made spacing.
    expect(screen.getByText("LUCIA")).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "Lora_500Medium",
      fontSize: 34,
    });
    expect(StyleSheet.flatten(screen.getByText("LUCIA").props.style).letterSpacing).toBeUndefined();
    const copy = screen.getByRole("button", { name: "Copiar código" });
    expect(copy).toHaveStyle({ borderColor: "#FFFBFB", borderWidth: 1.5, height: 44, width: 44 });
    expect(screen.getAllByRole("button", { name: "Compartir tu código" })).toHaveLength(1);
    const shareButton = screen.getByRole("button", { name: "Compartir tu código" });
    expect(shareButton).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 16 });
    expect(
      within(shareButton).getByTestId("glyph-share", { includeHiddenElements: true }),
    ).toBeOnTheScreen();

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

  // Follow-up 289 (16T): two equal columns on a tablet.
  it("puts the code and how it works beside «Tus invitadas» on a tablet", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width: 834 });
    try {
      const screen = await render(<App runtime={createClientRuntime(routeFetcher(routes([])))} />);
      const hidden = { includeHiddenElements: true };
      await waitFor(() => expect(screen.getByTestId("tab-profile", hidden)).toBeOnTheScreen(), {
        timeout: 10_000,
      });
      await fireEvent.press(screen.getByTestId("tab-profile", hidden));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Invita a una amiga" })).toBeOnTheScreen(),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Invita a una amiga" }));

      await waitFor(() => expect(screen.getByText("LUCIA")).toBeOnTheScreen());
      const left = screen.getByTestId("tablet-columns-left");
      const right = screen.getByTestId("tablet-columns-right");
      expect(left).toHaveStyle({ flex: 1 });
      expect(right).toHaveStyle({ flex: 1 });
      expect(within(left).getByTestId("referral-code-card")).toBeOnTheScreen();
      expect(within(left).getByTestId("referral-how-it-works")).toBeOnTheScreen();
      expect(within(right).getByText("Tus invitadas")).toBeOnTheScreen();
      expect(within(right).getByTestId("referrals-empty")).toBeOnTheScreen();
    } finally {
      jest.restoreAllMocks();
    }
  });
});

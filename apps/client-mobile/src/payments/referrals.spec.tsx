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
  referralCode: "REF-LUCIA",
};

// The referrals read still lists older awarded Referrals; the screen shows none.
const routes = {
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: 6000, reservedCentavos: 0, activity: [] }),
  "/api/v1/clients/current/referrals": () =>
    jsonResponse({
      referralCode: "REF-LUCIA",
      referrals: [
        {
          referredClientId: "client-2",
          referredName: "Sofía G.",
          state: "awarded",
          createdAt: "2026-09-10T15:00:00.000Z",
          awardedAt: "2026-09-12T15:00:00.000Z",
          awardCentavos: 6000,
        },
      ],
    }),
};

describe("Mis referidos (PAY-005)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows only the referral code, shares it, and promises the invite, with no Credit anywhere", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
    const screen = await render(<App runtime={createClientRuntime(routeFetcher(routes))} />);
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mis referidos" })).toBeOnTheScreen();
    });
    expect(screen.queryByText("Mi crédito")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Mis referidos" }));

    await waitFor(() => {
      expect(screen.getByText("REF-LUCIA")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Pronto podrás invitar a una amiga a una clase gratis."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/crédito/i)).toBeNull();
    expect(screen.queryByText("Tus invitaciones")).toBeNull();
    expect(screen.queryByText("Sofía G.")).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Compartir" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("REF-LUCIA") }),
    );
    share.mockRestore();
  });
});

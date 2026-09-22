import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
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

const routes = (credit: number, referrals: unknown[]) => ({
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({
      availableCentavos: credit,
      reservedCentavos: 0,
      activity:
        credit > 0
          ? [
              {
                id: "entry-1",
                kind: "referral_award",
                amountCentavos: credit,
                occurredAt: "2026-09-20T15:00:00.000Z",
              },
            ]
          : [],
    }),
  "/api/v1/clients/current/referrals": () =>
    jsonResponse({ referralCode: "REF-LUCIA", referrals }),
});

async function openPerfil(fetcher: ReturnType<typeof routeFetcher>) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Mis referidos" })).toBeOnTheScreen();
  });
  return screen;
}

describe("Referrals and Credit", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows the referral code, shares it, and lists referred friends with their status", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
    const screen = await openPerfil(
      routeFetcher(
        routes(6000, [
          {
            referredClientId: "client-2",
            referredName: "Sofía G.",
            state: "awarded",
            createdAt: "2026-09-10T15:00:00.000Z",
            awardedAt: "2026-09-12T15:00:00.000Z",
            awardCentavos: 6000,
          },
          {
            referredClientId: "client-3",
            referredName: "Mariana P.",
            state: "pending",
            createdAt: "2026-09-18T15:00:00.000Z",
            awardedAt: null,
            awardCentavos: null,
          },
        ]),
      ),
    );

    expect(screen.getByText("Bs 60")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Mis referidos" }));

    await waitFor(() => {
      expect(screen.getByText("REF-LUCIA")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Comparte tu código. Cuando un amigo se registre y haga su primer pago, ganas crédito.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Tu crédito: Bs 60")).toBeOnTheScreen();
    expect(screen.getByText("Sofía G.")).toBeOnTheScreen();
    expect(screen.getByText("Crédito ganado")).toBeOnTheScreen();
    expect(screen.getByText("Mariana P.")).toBeOnTheScreen();
    expect(screen.getByText("Esperando su primer pago")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Compartir" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("REF-LUCIA") }),
    );

    fireEvent.press(screen.getByRole("button", { name: "Tu crédito: Bs 60" }));
    await waitFor(() => {
      expect(screen.getByText("Bs 60 disponibles")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Este crédito se aplica automáticamente al monto que pagues por tu próximo plan.",
      ),
    ).toBeOnTheScreen();
    share.mockRestore();
  });

  it("encourages inviting friends when there is no credit and no referral yet", async () => {
    const screen = await openPerfil(routeFetcher(routes(0, [])));

    fireEvent.press(screen.getByRole("button", { name: "Mi crédito" }));
    await waitFor(() => {
      expect(screen.getByText("Bs 0")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Aún no tienes crédito. Invita a tus amigos para ganar."),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Ver mi código" }));
    await waitFor(() => {
      expect(screen.getByText("REF-LUCIA")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Aún no has invitado a nadie. ¡Comparte tu código!"),
    ).toBeOnTheScreen();
  });
});

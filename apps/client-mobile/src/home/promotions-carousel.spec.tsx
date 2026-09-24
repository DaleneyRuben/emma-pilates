import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};

const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });

const sources = (asset: string) =>
  [480, 960, 1440].map((width) => ({
    url: `/api/v1/promotion-images/${asset}/promotion_${width}/version-1`,
    mediaType: "image/webp",
    width,
    height: (width * 9) / 16,
  }));

const reformer = {
  id: "promotion-1",
  headline: "Nueva sala de Reformer en Urubó",
  description: "Desde el lunes 5 abrimos la segunda sala con seis camas nuevas.",
  image: { sources: sources("asset-1") },
};

const barre = {
  id: "promotion-2",
  headline: "Clases de Barre los sábados",
  description: "A las 9:00 en Centro, con Andrea.",
  image: { sources: sources("asset-2") },
};

function routes(overrides: Parameters<typeof routeFetcher>[0] = {}) {
  return {
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/clients/current/referrals": () =>
      jsonResponse({ referralCode: "REF-LUCIA", referrals: [] }),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([])),
    "/api/v1/promotions": () => jsonResponse([reformer, barre]),
    ...overrides,
  };
}

async function openHome(fetcher: typeof globalThis.fetch) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return screen;
}

describe("Client Home Promotions carousel", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows one card per published Promotion in carousel order with its 16:9 image and dots", async () => {
    const screen = await openHome(routeFetcher(routes()));

    await waitFor(() => {
      expect(screen.getByText("Nueva sala de Reformer en Urubó")).toBeOnTheScreen();
    });
    expect(screen.getByText("Novedades del estudio")).toBeOnTheScreen();
    expect(
      screen.getByText("Desde el lunes 5 abrimos la segunda sala con seis camas nuevas."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Clases de Barre los sábados")).toBeOnTheScreen();

    // Jest's window is 750 pt at 2×: the 718 pt card needs the 1440 px source,
    // resolved against the runtime's API origin (the API stands in for R2).
    const image = screen.getByLabelText("Nueva sala de Reformer en Urubó");
    expect(image).toHaveProp("source", {
      uri: "https://api.test/api/v1/promotion-images/asset-1/promotion_1440/version-1",
    });
    expect(image).toHaveStyle({ aspectRatio: 16 / 9 });

    expect(screen.getByLabelText("Promoción 1 de 2")).toBeOnTheScreen();
    await fireEvent(screen.getByTestId("promotions-carousel"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 732 } },
    });
    expect(screen.getByLabelText("Promoción 2 de 2")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Reformer/ })).not.toBeOnTheScreen();
  });

  it("holds a placeholder while the list loads and hides the section when it is empty", async () => {
    let answer: (() => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      answer = () => resolve(jsonResponse([]));
    });
    const fetcher = routeFetcher(routes());
    const promotionsFetcher = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
      input.toString() === "/api/v1/promotions" ? pending : fetcher(input, init),
    ) as unknown as typeof globalThis.fetch;
    const screen = await openHome(promotionsFetcher);

    expect(screen.getByLabelText("Cargando promociones")).toBeOnTheScreen();
    answer?.();

    await waitFor(() => {
      expect(screen.queryByLabelText("Cargando promociones")).not.toBeOnTheScreen();
    });
    expect(screen.queryByText("Novedades del estudio")).not.toBeOnTheScreen();
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
  });

  it("hides the section when the list fails and keeps the rest of Home", async () => {
    const screen = await openHome(
      routeFetcher(
        routes({
          "/api/v1/promotions": () =>
            jsonResponse({ code: "unexpected_error", status: 500 }, 500),
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Cargando promociones")).not.toBeOnTheScreen();
    });
    expect(screen.queryByText("Novedades del estudio")).not.toBeOnTheScreen();
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeOnTheScreen();
  });

  it("drops a card whose image no longer exists and reads the list again", async () => {
    let reads = 0;
    const screen = await openHome(
      routeFetcher(
        routes({
          "/api/v1/promotions": () => {
            reads += 1;
            return jsonResponse(reads === 1 ? [reformer, barre] : [barre]);
          },
        }),
      ),
    );
    await waitFor(() => {
      expect(screen.getByText("Nueva sala de Reformer en Urubó")).toBeOnTheScreen();
    });

    await fireEvent(screen.getByLabelText("Nueva sala de Reformer en Urubó"), "error");

    await waitFor(() => {
      expect(screen.queryByText("Nueva sala de Reformer en Urubó")).not.toBeOnTheScreen();
    });
    expect(screen.getByText("Clases de Barre los sábados")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Promoción \d de \d/)).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(reads).toBe(2);
    });
  });

  it("reads the list again on pull to refresh and hides the section once nothing is published", async () => {
    let reads = 0;
    const screen = await openHome(
      routeFetcher(
        routes({
          "/api/v1/promotions": () => {
            reads += 1;
            return jsonResponse(reads === 1 ? [reformer] : []);
          },
        }),
      ),
    );
    await waitFor(() => {
      expect(screen.getByText("Nueva sala de Reformer en Urubó")).toBeOnTheScreen();
    });

    // React Native's Jest mock keeps no props on the refresh control host, so
    // it is the scroll view's first child; the event still reaches onRefresh.
    const [refreshControl] = screen.getByTestId("home-scroll").children;
    await fireEvent(refreshControl as Parameters<typeof fireEvent>[0], "refresh");

    await waitFor(() => {
      expect(screen.queryByText("Novedades del estudio")).not.toBeOnTheScreen();
    });
    expect(reads).toBe(2);
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
  });
});

import { cleanup, render, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions, type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const today = boliviaCivilDate(new Date());
const profile = {
  id: "client-1",
  name: "Carla Méndez",
  email: "carla@example.com",
  phone: "+59170000000",
  referralCode: "REF-CARLA",
};
const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Trimestral",
    originalClassAllowance: 36,
    remainingClassAllowance: 25,
    startsOn: addCivilDays(today, -5),
    endsOn: addCivilDays(today, 85),
  },
};
const booking = {
  kind: "booking",
  bookingId: "booking-1",
  sessionId: "session-1",
  branchId: "branch-1",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  trainerPhoto: null,
  branchName: "Norte",
  startsAt: "2099-11-03T23:00:00.000Z",
  endsAt: "2099-11-03T23:50:00.000Z",
  capacity: 8,
  bookedCount: 3,
  attendeeInitials: ["LM", "SP"],
};
const promotion = {
  id: "promotion-1",
  headline: "Trae a una amiga en diciembre",
  description: "Su primera clase es gratis.",
  image: {
    sources: [
      {
        url: "/api/v1/promotion-images/asset-1/promotion_1440/version-1",
        mediaType: "image/webp",
        width: 1440,
        height: 810,
      },
    ],
  },
};

function useWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

async function openHome(bookings: unknown[]) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/bookings": () => jsonResponse(bookings),
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(active),
          "/api/v1/promotions": () => jsonResponse([promotion]),
        }),
      )}
    />,
  );
  await waitFor(() => expect(screen.getByText("Hola, Carla")).toBeOnTheScreen());
  return screen;
}

function hasStyle(node: { props: { style?: unknown } }, expected: Record<string, number>) {
  const flat = StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {};
  return Object.entries(expected).every(
    ([key, value]) => (flat as Record<string, unknown>)[key] === value,
  );
}

type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null };

/** The test IDs among `ids` in screen order, top to bottom. */
function order(screen: Awaited<ReturnType<typeof openHome>>, ids: string[]) {
  const found: string[] = [];
  const walk = (node: Json | Json[] | string | null) => {
    if (node === null || typeof node === "string") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const id = node.props?.testID as string | undefined;
    if (id !== undefined && ids.includes(id) && !found.includes(id)) found.push(id);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as Json | Json[] | null);
  return found;
}

// Follow-up 289 (02T): Inicio in a centred 720 pt column on a tablet, the
// next class beside the Plan, then «Reservar otra clase» and the promotion.
describe("Client Inicio on a tablet (02T)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("keeps the band's content and the page in a centred 720 pt column", async () => {
    useWidth(834);
    const screen = await openHome([]);

    expect(screen.getByTestId("home-header-content")).toHaveStyle({
      alignSelf: "center",
      maxWidth: 720,
    });
    const column = screen.getByTestId("tablet-column");
    expect(column).toHaveStyle({ alignSelf: "center", maxWidth: 720 });
    expect(within(column).getByText("Accesos rápidos")).toBeOnTheScreen();
    expect(within(column).getByTestId("shortcut-tiles")).toHaveStyle({ flexDirection: "row" });
  });

  it("puts the next class beside the Plan, then the button, then the promotion", async () => {
    useWidth(834);
    const screen = await openHome([booking]);

    await waitFor(() => expect(screen.getByTestId("home-next-class")).toBeOnTheScreen());
    const left = screen.getByTestId("tablet-columns-left");
    const right = screen.getByTestId("tablet-columns-right");
    expect(left).toHaveStyle({ flex: 1 });
    expect(right).toHaveStyle({ flex: 1 });
    expect(within(left).getByTestId("home-next-class")).toBeOnTheScreen();
    expect(within(right).getByTestId("home-plan-card")).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId("promotions-carousel")).toBeOnTheScreen());
    expect(order(screen, ["tablet-columns", "home-book", "promotions-carousel"])).toEqual([
      "tablet-columns",
      "home-book",
      "promotions-carousel",
    ]);
    expect(screen.getByRole("button", { name: "Reservar otra clase" })).toBeOnTheScreen();
  });

  it("keeps the 720 pt promotion card inside the margins at 768 pt", async () => {
    useWidth(768);
    const screen = await openHome([]);

    await waitFor(() => expect(screen.getByTestId("promotions-carousel")).toBeOnTheScreen());
    const card = within(screen.getByTestId("promotions-carousel")).getByText(
      "Trae a una amiga en diciembre",
    );
    let node = card.parent;
    while (node !== null && !hasStyle(node, { width: 688 })) node = node.parent;
    expect(node).not.toBeNull();
  });

  it("leaves a phone's Inicio without the tablet column", async () => {
    useWidth(393);
    const screen = await openHome([booking]);

    await waitFor(() => expect(screen.getByTestId("home-next-class")).toBeOnTheScreen());
    expect(screen.queryByTestId("tablet-column")).toBeNull();
    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    expect(screen.queryByTestId("home-header-content")).toBeNull();
  });
});

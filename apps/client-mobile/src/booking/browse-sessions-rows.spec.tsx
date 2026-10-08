import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

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
const classType = {
  id: "class-reformer",
  name: "Reformer Pilates",
  description: "",
  durationMinutes: 50,
};
const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const session = (id: string, startsAt: Date, availableSeats: number) => ({
  id,
  branchId: "branch-centro",
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classType.name,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60_000).toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

// MOB-042: 03's «Sucursal:» picker is the shared pill and every Session card,
// full ones included, ends in the chevron after the Trainer line.
describe("Client class list rows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  async function openClassList() {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          routeFetcher({
            "/api/v1/clients/current": () => jsonResponse(profile),
            "/api/v1/clients/current/subscription": () => jsonResponse(active),
            "/api/v1/branches": () =>
              jsonResponse([
                { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
              ]),
            "/api/v1/class-types": () => jsonResponse([classType]),
            [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
              () =>
                jsonResponse([
                  session("session-1", new Date(Date.now() + 60 * 60_000), 3),
                  session("session-2", new Date(Date.now() + 2 * 60 * 60_000), 0),
                ]),
          }),
        )}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    // The Inicio tab stays mounted with its own person glyph and chevron, so
    // the assertions stay inside each card.
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    return { cards, screen };
  }

  it("draws the picker pill and the Session cards as the frame does", async () => {
    const { cards, screen } = await openClassList();

    const pill = screen.getByRole("button", { name: "Sucursal: Centro" });
    expect(pill).toHaveStyle({ borderRadius: 999, minHeight: 44 });
    expect(screen.getByTestId("glyph-pin", hidden)).toHaveProp("width", 17);
    const picker = screen.getByTestId("branch-picker-chevron", hidden);
    expect(picker).toHaveProp("stroke", "#766D69");
    expect(screen.getByTestId("branch-picker-chevron-down", hidden)).toBeOnTheScreen();

    expect(cards[0].getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(cards[0].getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(cards[0].getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    expect(cards[1].getByText("Lleno")).toBeOnTheScreen();
    for (const card of cards) {
      const chevron = card.getByTestId("chevron", hidden);
      expect(chevron).toHaveProp("stroke", "#B78380");
      expect(chevron).toHaveProp("width", 19);
    }
  });

  // MOB-047: follow-up 84's seat pill — the seats on Palo de rosa tinte, a
  // full class on the neutral pill, 12 pt weight 500, never red, no dot.
  it("draws the seat pills as follow-up 84 settles them", async () => {
    const { cards } = await openClassList();

    expect(cards[0].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(cards[0].getByText("3 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(cards[1].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(cards[1].getByText("Lleno")).toHaveStyle({ color: "#6E6663", fontSize: 12 });
  });
});

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

// Follow-up 227: with one Branch, 03 shows it fixed without a chevron
// (walkthrough n.º 7); each Session is a Lino row with the start in Lora 20.
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
      expect(screen.getByText("Centro")).toBeOnTheScreen();
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

  it("shows the only Branch fixed and draws the v2 rows", async () => {
    const { cards, screen } = await openClassList();

    expect(screen.queryByRole("button", { name: "Sucursal: Centro" })).toBeNull();
    expect(screen.getByTestId("branch-fixed")).toBeOnTheScreen();
    expect(screen.queryByTestId("branch-picker-chevron", hidden)).toBeNull();

    expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })[0]).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
      minHeight: 72,
    });
    expect(cards[0].getByText("Reformer Pilates")).toHaveStyle({ fontSize: 16 });
    expect(cards[0].getByText("Emma Vargas · 50 min")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(cards[0].getByTestId("session-row-time")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 20,
    });
    for (const card of cards) {
      expect(card.getByTestId("chevron", hidden)).toHaveProp("stroke", "#6F6662");
    }
    expect(screen.getByText("2 clases")).toBeOnTheScreen();
  });

  // MOB-074 walk: a fixed 56 pt width broke «09:00» in Lora 20 into «09:0» and
  // «0» on the iPhone 16 Pro.
  it("keeps the start time on one line", async () => {
    const { cards } = await openClassList();
    const time = cards[0].getByTestId("session-row-time");

    expect(time).toHaveProp("numberOfLines", 1);
    expect(time).not.toHaveStyle({ width: 56 });
    expect(time).toHaveStyle({ minWidth: 56 });
  });

  it("draws the seat pills on Rosa tinte, and a full class on Arena", async () => {
    const { cards } = await openClassList();

    expect(cards[0].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#F2E4E1",
      borderRadius: 999,
    });
    expect(cards[0].getByText("3 cupos")).toHaveStyle({
      color: "#7D4F4B",
      fontSize: 12,
      fontWeight: "600",
    });
    expect(cards[1].getByTestId("seat-pill")).toHaveStyle({ backgroundColor: "#E6DBD0" });
    expect(cards[1].getByText("Lleno")).toHaveStyle({ color: "#4A4A4A", fontSize: 12 });
  });
});

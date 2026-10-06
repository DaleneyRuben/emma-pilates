import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const administrator = {
  id: "staff-2",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};
const minute = 60_000;
const hour = 60 * minute;
const carla = {
  id: "payment-1",
  clientName: "Carla Mendoza",
  planName: "Paquete de 8 clases",
  amountDueCentavos: 56_000,
  submittedAt: new Date(Date.now() - 20 * minute).toISOString(),
  receiptAvailable: true,
};
const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const startsAt = new Date(Date.now() + 3 * hour);
const session = {
  id: "session-1",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};

async function openPayments(sessions = [session]) {
  const screen = await render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/staff-members/current": () => jsonResponse(administrator),
          "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          "/api/v1/administrator/payments/pending": () => jsonResponse([carla]),
          "/api/v1/branches": () =>
            jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
          "/api/v1/class-types": () =>
            jsonResponse([
              { id: "class-reformer", name: "Reformer Pilates", description: "", durationMinutes: 50 },
            ]),
          [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
            () => jsonResponse(sessions),
        }),
        "administrator",
      )}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText("Carla Mendoza")).toBeOnTheScreen();
  });
  return screen;
}

// MOB-042: S11's payment card and S13's Session card as their frames draw them.
describe("Administrator rows", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the payment card with the avatar, the Lora name, and the chevron", async () => {
    const screen = await openPayments();

    expect(screen.getByTestId("avatar-circle")).toHaveStyle({ height: 44, width: 44 });
    expect(screen.getByText("C")).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 17 });
    expect(screen.getByText("Carla Mendoza")).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(screen.getByText("Paquete de 8 clases")).toHaveStyle({ color: "#766D69", fontSize: 13 });
    expect(screen.getByTestId("card-footer")).toHaveStyle({ paddingTop: 13 });
    expect(screen.getByText("Bs 560")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 20,
      fontVariant: ["tabular-nums"],
    });
    const clock = screen.getByTestId("glyph-clock", hidden);
    expect(clock).toHaveProp("width", 15);
    expect(clock).toHaveProp("stroke", "#C99A4E");
    expect(screen.getByText("Hace 20 minutos")).toHaveStyle({ color: "#766D69", fontSize: 13 });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });

  it("draws the cancel-class picker pill and the Session card", async () => {
    const screen = await openPayments();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toHaveStyle({
      borderRadius: 999,
      minHeight: 44,
    });
    expect(screen.getAllByTestId("glyph-pin", hidden)[0]).toHaveProp("width", 17);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    const card = within(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    expect(card.getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 20,
    });
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#4A4A4A", fontSize: 14 });
    expect(card.getByTestId("glyph-person", hidden)).toHaveProp("width", 16);
    expect(card.getByText("Sucursal Centro")).toHaveStyle({ color: "#766D69", fontSize: 13 });
    expect(card.getByTestId("glyph-pin", hidden)).toHaveProp("width", 15);
    expect(card.getByTestId("card-footer")).toHaveStyle({ paddingTop: 13 });
    expect(card.getByText("6 reservas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(card.getByText("6 cupos")).toBeOnTheScreen();
    // S11's payment card stays mounted under S13, so the chevron is read inside the card.
    const chevron = card.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });

  // MOB-047: follow-up 84's seat pill — the seats on Palo de rosa tinte, a
  // full class on the neutral pill, 12 pt weight 500, never red, no dot.
  it("draws the seat pills as follow-up 84 settles them", async () => {
    const full = { ...session, id: "session-full", bookedCount: 12, availableSeats: 0 };
    const screen = await openPayments([session, full]);

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    expect(cards[0].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(cards[0].getByText("6 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(cards[1].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(cards[1].getByText("Llena")).toHaveStyle({ color: "#6E6663", fontSize: 12 });
  });
});

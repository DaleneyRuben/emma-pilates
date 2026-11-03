import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

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
              {
                id: "class-reformer",
                name: "Reformer Pilates",
                description: "",
                durationMinutes: 50,
              },
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
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // v2 S11: a person row in a Lino group, the amount in Lora 18, and the
  // Accesos that used to sit in the header.
  it("draws the payment as a person row with its amount and the Accesos", async () => {
    const screen = await openPayments();

    expect(screen.getByText("CM")).toHaveStyle({ fontFamily: "Lora_400Regular" });
    expect(screen.getByText("Carla Mendoza")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getByText("Paquete de 8 clases · hace 20 minutos")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(screen.getByText("Bs 560")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 18,
      fontVariant: ["tabular-nums"],
    });
    expect(screen.getByText("Accesos")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Congelamientos" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeOnTheScreen();
  });

  // v2 S13: the start in Lora 20, the class over its Trainer, the bookings pill.
  it("draws each class to cancel as a v2 row with its bookings", async () => {
    const empty = { ...session, id: "session-empty", bookedCount: 0, availableSeats: 12 };
    const screen = await openPayments([session, empty]);

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    expect(cards[0].getByText("Reformer Pilates")).toHaveStyle({ fontSize: 16 });
    expect(cards[0].getByText("Emma Vargas")).toHaveStyle({ color: "#6F6662", fontSize: 13 });
    expect(cards[0].getByText("6 reservas").parent).toHaveStyle({ backgroundColor: "#E6DBD0" });
    expect(cards[1].getByText("Sin reservas")).toBeOnTheScreen();
  });
});

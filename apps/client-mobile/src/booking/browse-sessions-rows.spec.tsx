import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
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
const classType = { id: "class-reformer", name: "Reformer Pilates", description: "", durationMinutes: 50 };
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
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the picker pill and the Session cards as the frame does", async () => {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          routeFetcher({
            "/api/v1/clients/current": () => jsonResponse(profile),
            "/api/v1/clients/current/subscription": () => jsonResponse(active),
            "/api/v1/branches": () =>
              jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
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
    fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });

    const pill = screen.getByRole("button", { name: "Sucursal: Centro" });
    expect(pill).toHaveStyle({ borderRadius: 999, minHeight: 44 });
    expect(screen.getByTestId("glyph-pin", hidden)).toHaveProp("width", 17);
    const picker = screen.getByTestId("branch-picker-chevron", hidden);
    expect(picker).toHaveProp("stroke", "#766D69");
    expect(screen.getByTestId("branch-picker-chevron-down", hidden)).toBeOnTheScreen();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    expect(screen.getAllByText("Reformer Pilates")[0]).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(screen.getAllByText("Emma Vargas")[0]).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(screen.getAllByTestId("glyph-person", hidden)).toHaveLength(2);
    expect(screen.getByText("Lleno")).toBeOnTheScreen();
    const chevrons = screen.getAllByTestId("chevron", hidden);
    expect(chevrons).toHaveLength(2);
    expect(chevrons[1]).toHaveProp("stroke", "#B78380");
    expect(chevrons[1]).toHaveProp("width", 19);
  });
});

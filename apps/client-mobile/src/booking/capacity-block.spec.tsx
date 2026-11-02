import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import {
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
  colors,
  fontFamilies,
} from "@pilates/mobile-core";

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
const branch = { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" };
const classType = {
  id: "class-reformer",
  name: "Reformer Pilates",
  description: "Clase de Pilates con Reformer, ideal para tonificar todo el cuerpo.",
  durationMinutes: 50,
};
const startsAt = new Date(Date.now() + 60 * 60 * 1_000);
const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1_000);
const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const listUrl = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

const session = (availableSeats: number) => ({
  id: "session-1",
  branchId: branch.id,
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  branch,
  classType,
  classTypeName: classType.name,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

async function openDetail(availableSeats: number) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [listUrl]: () => jsonResponse([session(availableSeats)]),
    "/api/v1/sessions/session-1": () => jsonResponse(session(availableSeats)),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
  await waitFor(() => {
    expect(screen.getByText("Sobre la clase")).toBeOnTheScreen();
  });

  // 03's cards stay mounted under 04 with their own seat pills, so every
  // lookup is scoped to the block.
  return { screen, block: within(screen.getByTestId("capacity-block")) };
}

// Follow-up 227 (C04): the seats sit on the hero card, the free count in
// Lora 32 white over «de M cupos libres», a white bar by the booked share on
// white 25 %, and the «Lleno» pill on the hero when the class is full.
describe("Client Session detail capacity block", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the free seats in Lora 32 white and the white bar on the hero", async () => {
    const { screen, block } = await openDetail(3);

    expect(screen.getByTestId("session-hero")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(block.getByText("3")).toHaveStyle({
      color: colors.white,
      fontFamily: fontFamilies.display,
      fontSize: 32,
    });
    expect(block.getByText("de 12 cupos libres")).toBeOnTheScreen();
    expect(block.queryByText("Lleno")).not.toBeOnTheScreen();

    const bar = block.getByRole("progressbar");
    expect(bar).toHaveProp("accessibilityValue", { max: 12, min: 0, now: 9 });
    expect(bar).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.25)", height: 6 });
    expect(block.getByTestId("capacity-fill")).toHaveStyle({
      backgroundColor: colors.white,
      flex: 0.75,
    });
  });

  it("shows zero free seats and the Lleno pill when full", async () => {
    const { screen, block } = await openDetail(0);

    expect(block.getByText("0")).toBeOnTheScreen();
    expect(within(screen.getByTestId("session-hero")).getByText("Lleno")).toBeOnTheScreen();
    expect(block.getByTestId("capacity-fill")).toHaveStyle({ flex: 1 });
  });
});

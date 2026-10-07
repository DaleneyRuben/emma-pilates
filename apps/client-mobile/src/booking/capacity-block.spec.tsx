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
  fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
  await waitFor(() => {
    expect(screen.getByText("Sobre la clase")).toBeOnTheScreen();
  });

  // 03's cards stay mounted under 04 with their own seat pills, so every
  // lookup is scoped to the block.
  return { screen, block: within(screen.getByTestId("capacity-block")) };
}

// MOB-049 (follow-up 88): 04's capacity block is bare, no card and no label.
// The count row sits above the 7 pt bar: «N de M cupos disponibles» with the
// number in Lora 18 and «N reservados» on the right, or the «Lleno» seat pill
// when the class is full; the bar's track is Palo de rosa tinte, its fill
// Palo de rosa by the booked share, Icono tenue when full.
describe("Client Session detail capacity block", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the count in Lora, the booked count, and the bar without a card", async () => {
    const { screen, block } = await openDetail(3);

    expect(screen.queryByText("Cupos disponibles")).not.toBeOnTheScreen();
    expect(screen.getByTestId("capacity-block")).not.toHaveStyle({
      backgroundColor: colors.white,
    });

    expect(block.getByText("3 de 12 cupos disponibles")).toHaveStyle({
      color: colors.text,
      fontSize: 15,
    });
    expect(block.getByText("3")).toHaveStyle({
      fontFamily: fontFamilies.heading,
      fontSize: 18,
    });
    expect(block.getByText("9 reservados")).toHaveStyle({
      color: colors.textSubtle,
      fontSize: 12,
    });
    expect(block.queryByTestId("seat-pill")).not.toBeOnTheScreen();

    const bar = block.getByRole("progressbar");
    expect(bar).toHaveProp("accessibilityValue", { max: 12, min: 0, now: 9 });
    expect(bar).toHaveStyle({ backgroundColor: colors.primaryTint, height: 7 });
    expect(block.getByTestId("capacity-fill")).toHaveStyle({
      backgroundColor: colors.primary,
      flex: 0.75,
    });
  });

  it("keeps the count at zero beside the Lleno pill and greys the bar when full", async () => {
    const { block } = await openDetail(0);

    expect(block.getByText("0 de 12 cupos disponibles")).toBeOnTheScreen();
    expect(block.queryByText("12 reservados")).not.toBeOnTheScreen();

    const pill = block.getByTestId("seat-pill");
    expect(within(pill).getByText("Lleno")).toHaveStyle({ color: colors.textSecondary });
    expect(pill).toHaveStyle({ backgroundColor: colors.neutralPill });
    expect(block.getAllByText("Lleno")).toHaveLength(1);

    expect(block.getByTestId("capacity-fill")).toHaveStyle({
      backgroundColor: colors.iconQuiet,
      flex: 1,
    });
  });
});

import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import {
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
  textVariants,
} from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher, staffPhotoRoute } from "../test-support";

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
const session = (
  id: string,
  startsAt: Date,
  availableSeats: number,
  trainerPhoto: { imageAssetId: string } | null = null,
) => ({
  id,
  branchId: "branch-centro",
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classType.name,
  trainerName: "Emma Vargas",
  trainerPhoto,
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60_000).toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

// Follow-up 227: with one Branch, 03 shows it fixed without a chevron
// (walkthrough n.º 7); each Session is a row with the start in Lora 20.
// FIX-089 (ClaseE): the rows share one Crema card; the start sits in a Rubor
// box and a chevron says the row opens the class.
describe("Client class list rows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  async function openClassList() {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(active),
      "/api/v1/branches": () =>
        jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
      "/api/v1/class-types": () => jsonResponse([classType]),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () =>
          jsonResponse([
            session("session-1", new Date(Date.now() + 60 * 60_000), 3, {
              imageAssetId: "asset-emma",
            }),
            session("session-2", new Date(Date.now() + 2 * 60 * 60_000), 0),
          ]),
      ...staffPhotoRoute("asset-emma"),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
    await waitFor(() => {
      expect(screen.getByText("Sucursal: Centro")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    // The Inicio tab stays mounted with its own person glyph and chevron, so
    // the assertions stay inside each card.
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    return { cards, fetcher, screen };
  }

  it("shows the only Branch fixed and draws the v2 rows", async () => {
    const { cards, screen } = await openClassList();

    expect(screen.queryByRole("button", { name: "Sucursal: Centro" })).toBeNull();
    expect(screen.getByTestId("branch-fixed")).toBeOnTheScreen();
    expect(screen.queryByTestId("branch-picker-chevron", hidden)).toBeNull();

    expect(screen.getByTestId("browse-session-group")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    expect(cards[0].getByText("Reformer Pilates")).toHaveStyle(textVariants["titulo-fila"]);
    expect(cards[0].getByText("Emma Vargas · 50 min")).toHaveStyle({
      color: "#93615D",
      ...textVariants.secundario,
    });
    // FIX-041 (follow-up 242): the trainer line stays on one line.
    expect(cards[0].getByText("Emma Vargas · 50 min")).toHaveProp("numberOfLines", 1);
    expect(cards[0].getByText(/^\d\d:\d\d$/)).toHaveStyle(textVariants.cifra);
    for (const card of cards) {
      expect(card.getByTestId("chevron", hidden)).toBeOnTheScreen();
    }
    expect(screen.getByText("2 clases")).toBeOnTheScreen();
  });

  // The owner's pick C: the trainer line is her name only, without a face.
  it("writes the trainer line without her photo or initials", async () => {
    const { cards, fetcher } = await openClassList();

    for (const card of cards) {
      expect(card.getByText("Emma Vargas · 50 min")).toBeOnTheScreen();
      expect(card.queryByLabelText("Foto de Emma Vargas")).toBeNull();
      expect(card.queryByText("EV")).toBeNull();
    }
    expect(fetcher).not.toHaveBeenCalledWith("/api/v1/staff-photos/asset-emma?variant=thumbnail");
  });

  // MOB-074 walk: a fixed 56 pt width broke «09:00» in Lora 20 into «09:0» and
  // «0» on the iPhone 16 Pro. Follow-up 285: the time never shrinks and is never
  // cut to «08:…», so it grows with the text size instead.
  it("keeps the start time on one line", async () => {
    const { cards } = await openClassList();
    const box = cards[0].getByTestId("class-row-time");
    expect(box).not.toHaveProp("numberOfLines");
    expect(box).not.toHaveStyle({ width: 62 });
    expect(box).toHaveStyle({ flexShrink: 0, minWidth: 62 });
  });

  // ClaseE draws the places short in the row («9 de 12») so the trainer line
  // keeps its length; the detail and the spoken label say «9 de 12 lugares».
  it("writes the seats as short bold text, without a pill", async () => {
    const { cards } = await openClassList();

    expect(cards[0].queryByTestId("seat-pill")).toBeNull();
    // Follow-up 285: the seats are `pastilla` in ink.
    const seats = { color: "#93615D", ...textVariants.pastilla };
    expect(cards[0].getByText("9 de 12")).toHaveStyle(seats);
    expect(cards[1].getByText("Lleno")).toHaveStyle(seats);
  });
});

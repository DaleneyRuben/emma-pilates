import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { formatListDate } from "@pilates/api-contracts";
import { clearMobileQueryCache, formatStartTime } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const minute = 60_000;

const bookings = [
  { bookingId: "booking-1", clientName: "Lucía Fernández", classNumber: 12 },
  { bookingId: "booking-2", clientName: "Elena Prueba", classNumber: 1 },
  { bookingId: "booking-3", clientName: "Mariana Prueba", classNumber: 3 },
];

// A class `offset` minutes from now that lasts an hour.
async function openRoster(offset: number, roster: unknown[] = bookings) {
  const startsAt = new Date(Date.now() + offset * minute).toISOString();
  const endsAt = new Date(Date.now() + (offset + 60) * minute).toISOString();
  const session = {
    bookedCount: roster.length,
    branchName: "Achumani",
    capacity: 8,
    classTypeName: "Mat Pilates",
    endsAt,
    sessionId: "session-1",
    startsAt,
  };
  const fetcher = routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse([session]),
    "/api/v1/trainer/sessions/session-1/roster": () =>
      jsonResponse({ ...session, bookings: roster }),
    "POST /api/v1/sessions/session-1/attendance": () => new Response(null, { status: 201 }),
    "/api/v1/staff-members/current": () =>
      jsonResponse({
        id: "staff-1",
        name: "Daniela Rojas",
        email: "daniela@example.com",
        phone: null,
        role: "trainer",
        branches: [],
      }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
  await fireEvent.press(
    await screen.findByRole("button", { name: /^(Próxima[^:]*: )?Mat Pilates,/ }),
  );
  await screen.findByTestId("roster-block");
  return { endsAt, fetcher, screen, startsAt };
}

// E6 B + A (board E6C): before the class, who is coming and «Tomar
// asistencia»; once it starts, or on that tap, «Vino» / «No vino» per Client.
describe("Trainer roster before and during the class (E6 B + A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows who is coming before the class, with the new Client's note", async () => {
    const { screen, startsAt } = await openRoster(20);

    const block = within(screen.getByTestId("roster-block"));
    expect(block.getByText("EMPIEZA EN 20 MIN")).toBeOnTheScreen();
    expect(block.getByText(`${formatStartTime(startsAt)} · Mat Pilates`)).toBeOnTheScreen();
    expect(
      block.getByText(`${formatListDate(startsAt)} · Achumani · 3 de 8 lugares · 1 clienta nueva`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Quién viene · 3 clientas")).toBeOnTheScreen();
    expect(screen.getByText("12.ª clase")).toBeOnTheScreen();
    expect(screen.getByText("Primera clase: explícale el método")).toBeOnTheScreen();
    expect(screen.getByText("Nueva")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /: Vino$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar asistencia" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reportar una falla de equipo" })).toBeOnTheScreen();
  });

  it("turns into attendance on «Tomar asistencia», saving once the class starts", async () => {
    const { screen } = await openRoster(20);

    await fireEvent.press(screen.getByRole("button", { name: "Tomar asistencia" }));

    const block = within(screen.getByTestId("roster-block"));
    expect(block.getByText("Marcadas 0 de 3")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Elena Prueba: Vino" }));
    expect(block.getByText("Marcadas 1 de 3")).toBeOnTheScreen();
    expect(screen.getByText("Primera clase")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Guardar asistencia" })).toHaveProp(
      "accessibilityState",
      { busy: false, disabled: true },
    );
    expect(
      screen.getByText("Podrás guardar la asistencia cuando empiece la clase."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reportar una falla de equipo" })).toBeOnTheScreen();
  });

  it("takes attendance while the class is on and saves Vino and No vino", async () => {
    const { endsAt, fetcher, screen } = await openRoster(-10, [
      { ...bookings[0], attendanceOutcome: "attended" },
      bookings[1],
      bookings[2],
    ]);

    const block = within(screen.getByTestId("roster-block"));
    expect(block.getByText(`EN CURSO · TERMINA ${formatStartTime(endsAt)}`)).toBeOnTheScreen();
    expect(block.getByText("Marcadas 1 de 3")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Tomar asistencia" })).toBeNull();
    expect(screen.getByRole("button", { name: "Lucía Fernández: Vino" })).toHaveProp(
      "accessibilityState",
      { selected: true },
    );
    expect(screen.getByText("Falta marcar a 2 clientas.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Elena Prueba: No vino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mariana Prueba: Vino" }));
    expect(block.getByText("Marcadas 3 de 3")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar asistencia" }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/sessions/session-1/attendance",
        expect.objectContaining({
          body: JSON.stringify({
            outcomes: [
              { bookingId: "booking-1", outcome: "attended" },
              { bookingId: "booking-2", outcome: "no_show" },
              { bookingId: "booking-3", outcome: "attended" },
            ],
          }),
        }),
      );
      expect(screen.getByText("Asistencia guardada")).toBeOnTheScreen();
    });
  });

  it("keeps a phone's column on a tablet", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const { screen } = await openRoster(20);

    expect(screen.getByTestId("roster-footer")).toHaveStyle({ maxWidth: 560 });
    jest.restoreAllMocks();
  });

  it("says when a finished class ended", async () => {
    const { endsAt, screen } = await openRoster(-90);

    expect(
      within(screen.getByTestId("roster-block")).getByText(
        `TERMINÓ A LAS ${formatStartTime(endsAt)}`,
      ),
    ).toBeOnTheScreen();
  });
});

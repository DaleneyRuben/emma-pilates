import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  weekStartOf,
} from "../lib/bolivia-time";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { roster, rosterPath } from "../test/roster-fixtures";
import {
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { classPanelName } from "../test/class-panel";

const lastMonday = addDays(weekStartOf(boliviaToday()), -7);
const pastReformer = {
  ...mondayReformer,
  id: "1e000000-0000-5000-8000-000000000099",
  startsAt: boliviaInstant(lastMonday, "07:00"),
  endsAt: boliviaInstant(lastMonday, "07:50"),
};

const bookedRoster = () => {
  const base = roster(mondayReformer.id, [
    "Ana Quiroga",
    "Lucía Fernández",
    "Elena Prueba",
  ]);
  const [ana, lucia, elena] = base.bookings;
  return {
    ...base,
    bookings: [
      { ...ana!, classNumber: 1 },
      { ...lucia!, classNumber: 12 },
      { ...elena!, classNumber: 3, founder: true },
    ],
  };
};

const openSession = async (name: RegExp, week = nextMonday) => {
  const view = renderAdmin(`/horario?week=${week}`);
  await view.user.click(await screen.findByRole("button", { name }));
  const panel = await screen.findByRole("dialog", { name: classPanelName });
  return { ...view, panel };
};

// W1 (Editar clase A, verification 2026-11-20): each Client with her class
// number or the founder mark, «Quitar» on each booking, and «Cerrar» below.
describe("W1 the class panel's bookings", () => {
  useMockServer();
  let removed: string[];
  beforeEach(() => {
    removed = [];
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([mondayReformer, pastReformer]),
      ),
      http.get(apiUrl(rosterPath(mondayReformer.id)), () => {
        const current = bookedRoster();
        return jsonResponse({
          ...current,
          bookings: current.bookings.filter(
            (booking) => !removed.includes(booking.bookingId),
          ),
        });
      }),
      http.get(apiUrl(rosterPath(pastReformer.id)), () =>
        jsonResponse(roster(pastReformer.id, ["Ana Quiroga"])),
      ),
      http.delete(apiUrl("/api/v1/bookings/:bookingId"), ({ params }) => {
        removed.push(String(params.bookingId));
        return new Response(null, { status: 204 });
      }),
    );
  });

  it("says under each name her class number, a first class or a founder", async () => {
    const { panel } = await openSession(/Reformer Pilates, 07:00/);
    const booked = await within(panel).findByRole("region", {
      name: "Reservaron (3)",
    });
    const rows = within(booked).getAllByRole("listitem");
    expect(within(rows[0]!).getByText("Primera clase")).toBeVisible();
    expect(within(rows[1]!).getByText("12.ª clase")).toBeVisible();
    expect(within(rows[2]!).getByText("3.ª clase · Fundadora")).toBeVisible();
  });

  it("removes a booking after confirming and says so", async () => {
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    await within(panel).findByRole("region", { name: "Reservaron (3)" });

    await user.click(
      within(panel).getByRole("button", { name: "Quitar a Ana Quiroga" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Quitar a Ana Quiroga de esta clase?",
    });
    expect(
      within(confirm).getByText(
        "La clase vuelve a su plan y, si hay lista de espera, entra la primera.",
      ),
    ).toBeVisible();
    await user.click(within(confirm).getByRole("button", { name: "Quitar" }));

    expect(
      await within(panel).findByText("Quitamos a Ana Quiroga de la clase."),
    ).toBeVisible();
    expect(
      await within(panel).findByRole("region", { name: "Reservaron (2)" }),
    ).toBeVisible();
    expect(removed).toEqual([bookedRoster().bookings[0]!.bookingId]);
  });

  it("explains a booking inside the cancellation window cannot be removed", async () => {
    server.use(
      http.delete(apiUrl("/api/v1/bookings/:bookingId"), () =>
        problemResponse(409, "booking_cancellation_window"),
      ),
    );
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    await within(panel).findByRole("region", { name: "Reservaron (3)" });

    await user.click(
      within(panel).getByRole("button", { name: "Quitar a Lucía Fernández" }),
    );
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Quitar" }));

    expect(
      await within(confirm).findByText(
        "La clase ya está dentro del plazo de cancelación: no se puede quitar esta reserva.",
      ),
    ).toBeVisible();
  });

  it("closes the panel from «Cerrar» below the bookings", async () => {
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    await within(panel).findByRole("region", { name: "Reservaron (3)" });

    const close = within(panel).getAllByRole("button", { name: "Cerrar" });
    expect(close).toHaveLength(2);
    await user.click(close.at(-1)!);

    expect(
      screen.queryByRole("dialog", { name: classPanelName }),
    ).not.toBeInTheDocument();
  });

  it("offers no «Quitar» on a past class", async () => {
    const { panel } = await openSession(/Reformer Pilates, 07:00/, lastMonday);
    expect(await within(panel).findByText("Ana Quiroga")).toBeVisible();
    expect(
      within(panel).queryByRole("button", { name: /^Quitar/ }),
    ).not.toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  formatCivilDate,
  weekdayOf,
} from "../lib/bolivia-time";
import { centro } from "../test/booking-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  dayOfNextWeek,
  mondayReformer,
  nextMonday,
  reformer,
  sessionFormHandlers,
  sessionsPath,
  valeria,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";
import { classPanelName } from "../test/class-panel";

const longDay = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const slotName = (date: string, time: string) =>
  `Nueva clase el ${longDay.format(new Date(`${date}T12:00:00Z`)).replace(",", "")} a las ${time}`;

const weekHandler = (sessions: readonly unknown[] = weekSessions) =>
  http.get(apiUrl(sessionsPath), () => jsonResponse(sessions));

const openWeek = async (week = nextMonday) => {
  const view = renderAdmin(`/horario?week=${week}`);
  await screen.findByRole("table", { name: "Semana" });
  return view;
};

describe("AW02 empty slots on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("opens Nueva clase on that day and hour in the selected Branch, everything else as the header button", async () => {
    let body: unknown;
    server.use(
      weekHandler(),
      http.post(apiUrl(sessionsPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse({}, 201);
      }),
    );
    const { user } = await openWeek();

    await user.click(
      screen.getByRole("button", { name: slotName(dayOfNextWeek(1), "10:00") }),
    );
    const panel = await screen.findByRole("dialog", { name: "Nueva clase" });

    expect(
      within(panel).getByText("Sucursal Centro · sala única"),
    ).toBeVisible();
    expect(within(panel).getByLabelText("Una sola vez")).toBeChecked();
    expect(within(panel).getByLabelText("Fecha")).toHaveValue(
      formatCivilDate(dayOfNextWeek(1)),
    );
    expect(within(panel).getByLabelText("Hora")).toHaveValue("10:00");
    expect(within(panel).getByLabelText("Tipo de clase")).toHaveValue("");
    expect(within(panel).getByLabelText("Instructora")).toHaveValue("");
    expect(within(panel).getByLabelText("Capacidad")).toHaveValue("");

    await user.selectOptions(
      within(panel).getByLabelText("Tipo de clase"),
      reformer.id,
    );
    await user.selectOptions(
      within(panel).getByLabelText("Instructora"),
      valeria.id,
    );
    await user.clear(within(panel).getByLabelText("Hora"));
    await user.type(within(panel).getByLabelText("Hora"), "10:30");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        branchId: centro.id,
        classTypeId: reformer.id,
        trainerStaffMemberId: valeria.id,
        startsAt: boliviaInstant(dayOfNextWeek(1), "10:30"),
        durationMinutes: 60,
        capacity: 10,
      }),
    );
  });

  it("carries the day into Cada semana as its weekday and Vigente desde", async () => {
    server.use(weekHandler());
    const { user } = await openWeek();

    await user.click(
      screen.getByRole("button", { name: slotName(dayOfNextWeek(3), "18:00") }),
    );
    const panel = await screen.findByRole("dialog", { name: "Nueva clase" });
    await user.click(within(panel).getByLabelText("Cada semana"));

    expect(within(panel).getByLabelText("Día, fila 1")).toHaveValue("4");
    expect(within(panel).getByLabelText("Hora, fila 1")).toHaveValue("18:00");
    expect(within(panel).getByLabelText("Vigente desde")).toHaveValue(
      formatCivilDate(dayOfNextWeek(3)),
    );
  });

  it("is reached by keyboard between the day's Session blocks, which still open in edit mode", async () => {
    server.use(weekHandler());
    const { user } = await openWeek();

    const block = screen.getByRole("button", {
      name: /Reformer Pilates, 07:00, Valeria Peña/,
    });
    block.focus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: slotName(dayOfNextWeek(0), "08:00") }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    const panel = await screen.findByRole("dialog", { name: "Nueva clase" });
    expect(within(panel).getByLabelText("Hora")).toHaveValue("08:00");

    await user.keyboard("{Escape}");
    await user.click(block);
    expect(
      await screen.findByRole("dialog", { name: classPanelName }),
    ).toBeInTheDocument();
  });

  it("offers no slot for an hour a Session fully covers", async () => {
    const hourLong = {
      ...mondayReformer,
      endsAt: boliviaInstant(dayOfNextWeek(0), "08:00"),
    };
    server.use(weekHandler([hourLong]));
    await openWeek();

    expect(
      screen.queryByRole("button", {
        name: slotName(dayOfNextWeek(0), "07:00"),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: slotName(dayOfNextWeek(1), "07:00") }),
    ).toBeInTheDocument();
  });

  // FIX-090: a past slot never proposes a past date; it proposes the next
  // coming day with the slot's weekday, at the slot's hour.
  it("opens a past slot's form on the next coming day of that weekday", async () => {
    const lastWeek = addDays(nextMonday, -14);
    server.use(weekHandler([]));
    const { user } = await openWeek(lastWeek);

    await user.click(
      screen.getByRole("button", { name: slotName(lastWeek, "09:00") }),
    );
    const panel = await screen.findByRole("dialog", { name: "Nueva clase" });
    const today = boliviaToday();
    const proposed = [0, 1, 2, 3, 4, 5, 6, 7]
      .map((offset) => addDays(today, offset))
      .filter((day) => weekdayOf(day) === weekdayOf(lastWeek))
      .map(formatCivilDate);
    expect(proposed).toContain(
      (within(panel).getByLabelText("Fecha") as HTMLInputElement).value,
    );
    expect(within(panel).getByLabelText("Hora")).toHaveValue("09:00");
  });
});

describe("AW02 on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(weekHandler());
  });

  it("keeps the header button as the only way to create", async () => {
    renderAdmin(`/horario?week=${nextMonday}`);
    await screen.findByRole("tablist", { name: "Días de la semana" });
    expect(
      screen.queryByRole("button", { name: /^Nueva clase el / }),
    ).not.toBeInTheDocument();
  });
});

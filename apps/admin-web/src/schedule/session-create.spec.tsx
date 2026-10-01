import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaInstant, boliviaToday } from "../lib/bolivia-time";
import { centro } from "../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  daniela,
  dayOfNextWeek,
  mat,
  mondaySchedule,
  nextMonday,
  reformer,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  valeria,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

let weekReads = 0;
const weekHandler = () =>
  http.get(apiUrl(sessionsPath), () => {
    weekReads += 1;
    return jsonResponse(weekSessions);
  });

const openNewSession = async () => {
  const view = renderAdmin(`/?week=${nextMonday}`);
  await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });
  await view.user.click(screen.getByRole("button", { name: "Nueva sesión" }));
  const panel = await screen.findByRole("dialog", { name: "Nueva sesión" });
  return { ...view, panel };
};

const optionsOf = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent);

describe("AW03 Nueva sesión on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    weekReads = 0;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(weekHandler());
  });

  it("creates a one-off Session at a Bolivia date and time with the Class Type's capacity", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(sessionsPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse({}, 201);
      }),
    );
    const { panel, user } = await openNewSession();

    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText("Sucursal Centro · sala única"),
    ).toBeVisible();
    expect(within(panel).getByLabelText("Una sola vez")).toBeChecked();
    const classType = within(panel).getByLabelText("Tipo de clase");
    await waitFor(() =>
      expect(optionsOf(classType)).toEqual([
        "Elige un tipo de clase",
        "Mat Pilates",
        "Reformer Pilates",
      ]),
    );
    const trainer = within(panel).getByLabelText("Entrenadora");
    await waitFor(() =>
      expect(optionsOf(trainer)).toEqual([
        "Elige una entrenadora",
        "Daniela Ortiz",
        "Valeria Peña",
      ]),
    );
    expect(trainer).toHaveAccessibleDescription(
      "Solo entrenadoras asignadas a esta sucursal.",
    );

    await user.selectOptions(classType, reformer.id);
    expect(within(panel).getByLabelText("Capacidad")).toHaveValue("10");
    await user.selectOptions(trainer, valeria.id);
    await user.type(within(panel).getByLabelText("Fecha"), dayOfNextWeek(3));
    await user.type(within(panel).getByLabelText("Hora"), "18:30");
    const readsBefore = weekReads;
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        branchId: centro.id,
        classTypeId: reformer.id,
        trainerStaffMemberId: valeria.id,
        startsAt: boliviaInstant(dayOfNextWeek(3), "18:30"),
        capacity: 10,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sesión creada.",
    );
    expect(
      screen.queryByRole("dialog", { name: "Nueva sesión" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(weekReads).toBeGreaterThan(readsBefore));
  });

  it("creates a weekly schedule from a Vigente desde date and reports its occurrences", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(schedulesPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse(
          { schedule: mondaySchedule, created: 4, skipped: 1 },
          201,
        );
      }),
    );
    const { panel, user } = await openNewSession();

    await user.click(within(panel).getByLabelText("Cada semana"));
    expect(within(panel).queryByLabelText("Fecha")).not.toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Genera las sesiones de los próximos 30 días y las sigue creando cada semana.",
      ),
    ).toBeInTheDocument();
    await user.selectOptions(
      await within(panel).findByLabelText("Tipo de clase"),
      mat.id,
    );
    await user.selectOptions(
      within(panel).getByLabelText("Entrenadora"),
      daniela.id,
    );
    await user.selectOptions(
      within(panel).getByLabelText("Día de la semana"),
      "3",
    );
    await user.type(within(panel).getByLabelText("Hora"), "19:00");
    await user.clear(within(panel).getByLabelText("Capacidad"));
    await user.type(within(panel).getByLabelText("Capacidad"), "12");
    await user.type(within(panel).getByLabelText("Vigente desde"), nextMonday);
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        branchId: centro.id,
        classTypeId: mat.id,
        trainerStaffMemberId: daniela.id,
        weekday: 3,
        startsAtLocal: "19:00",
        capacity: 12,
        effectiveFrom: nextMonday,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Serie semanal creada: 4 sesiones en los próximos 30 días. 1 se omitió porque se cruzaba con otra sesión.",
    );
  });

  it("validates every field before sending and refuses a past date", async () => {
    const { panel, user } = await openNewSession();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      within(panel).getByLabelText("Tipo de clase"),
    ).toHaveAccessibleDescription("Elige un tipo de clase.");
    expect(within(panel).getByLabelText("Hora")).toHaveAccessibleDescription(
      "Elige la hora.",
    );

    await user.type(
      within(panel).getByLabelText("Fecha"),
      addDays(boliviaToday(), -1),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(within(panel).getByLabelText("Fecha")).toHaveAccessibleDescription(
      "Elige una fecha desde hoy.",
    );
  });

  it("explains an overlap and a Trainer who can no longer teach there by their codes", async () => {
    let attempts = 0;
    server.use(
      http.post(apiUrl(sessionsPath), () => {
        attempts += 1;
        return attempts === 1
          ? problemResponse(409, "session_overlap")
          : problemResponse(409, "trainer_not_assignable");
      }),
    );
    const { panel, user } = await openNewSession();
    await user.selectOptions(
      await within(panel).findByLabelText("Tipo de clase"),
      reformer.id,
    );
    await user.selectOptions(
      within(panel).getByLabelText("Entrenadora"),
      valeria.id,
    );
    await user.type(within(panel).getByLabelText("Fecha"), dayOfNextWeek(0));
    await user.type(within(panel).getByLabelText("Hora"), "07:15");

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await within(panel).findByText(
        "Se cruza con otra sesión de esta sucursal o con otra clase de la entrenadora.",
      ),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(
        within(panel).getByLabelText("Entrenadora"),
      ).toHaveAccessibleDescription(
        expect.stringContaining(
          "Esta entrenadora ya no puede dar clases en esta sucursal.",
        ),
      ),
    );
    expect(within(panel).getByLabelText("Hora")).toHaveValue("07:15");
  });
});

describe("AW03 Nueva sesión on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(weekHandler());
  });

  it("opens as a full-screen sheet", async () => {
    const { panel } = await openNewSession();
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
  });
});

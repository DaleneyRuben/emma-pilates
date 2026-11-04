import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, formatCivilDate } from "../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  daniela,
  dayOfNextWeek,
  mat,
  mondaySchedule,
  nextMonday,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
  weeklyScheduleId,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const noEnd =
  "Sin fecha de fin, la serie sigue cada semana hasta que la pauses o la termines.";

const openWeekly = async () => {
  const view = renderAdmin(`/horario?week=${nextMonday}`);
  await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });
  await view.user.click(screen.getByRole("button", { name: "Nueva sesión" }));
  const panel = await screen.findByRole("dialog", { name: "Nueva sesión" });
  await view.user.click(within(panel).getByLabelText("Cada semana"));
  await view.user.selectOptions(
    await within(panel).findByLabelText("Tipo de clase"),
    mat.id,
  );
  await view.user.selectOptions(
    within(panel).getByLabelText("Entrenadora"),
    daniela.id,
  );
  await view.user.selectOptions(
    within(panel).getByLabelText("Día, fila 1"),
    "3",
  );
  await view.user.type(within(panel).getByLabelText("Hora, fila 1"), "19:00");
  await view.user.type(
    within(panel).getByLabelText("Vigente desde"),
    nextMonday,
  );
  return { ...view, panel };
};

const openSeries = async () => {
  const view = renderAdmin(`/horario?week=${nextMonday}`);
  await view.user.click(
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
  );
  const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
  await view.user.click(within(panel).getByLabelText("Esta y las futuras"));
  await within(panel).findByLabelText("Día de la semana");
  return { ...view, panel };
};

const replacementPath = `${schedulesPath}/${weeklyScheduleId}/replacement`;
const replaced = {
  ended: mondaySchedule,
  replacement: mondaySchedule,
  cancelledSessions: 0,
  keptSessions: 0,
  created: 0,
  skipped: 0,
};

// BKM-018: «Vigente hasta (opcional)» on a weekly series. The Administrator
// picks the last date with classes; the API keeps the day after as the
// exclusive end.
describe("AW03 Vigente hasta on a weekly series", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("creates a series that ends on the chosen last date", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(apiUrl(`${schedulesPath}/batch`), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return jsonResponse(
          { schedules: [{ schedule: mondaySchedule, created: 2, skipped: 0 }] },
          201,
        );
      }),
    );
    const { panel, user } = await openWeekly();

    expect(within(panel).getByText(noEnd)).toBeInTheDocument();
    await user.type(
      within(panel).getByLabelText("Vigente hasta (opcional)"),
      dayOfNextWeek(20),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body?.effectiveUntil).toBe(dayOfNextWeek(21)));
  });

  it("sends no end when it is left empty", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(apiUrl(`${schedulesPath}/batch`), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return jsonResponse(
          { schedules: [{ schedule: mondaySchedule, created: 4, skipped: 0 }] },
          201,
        );
      }),
    );
    const { panel, user } = await openWeekly();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body?.effectiveUntil).toBeNull();
  });

  it("refuses a last date before the start and sends nothing", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl(`${schedulesPath}/batch`), () => {
        calls += 1;
        return jsonResponse({ schedules: [] }, 201);
      }),
    );
    const { panel, user } = await openWeekly();

    await user.type(
      within(panel).getByLabelText("Vigente hasta (opcional)"),
      addDays(nextMonday, -1),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Elige una fecha desde «Vigente desde» en adelante.",
      ),
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it("shows a series' last date and lets the Administrator remove it", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(apiUrl(schedulesPath), () =>
        jsonResponse([
          { ...mondaySchedule, effectiveUntil: dayOfNextWeek(28) },
        ]),
      ),
      http.post(apiUrl(replacementPath), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return jsonResponse(replaced, 201);
      }),
    );
    const { panel, user } = await openSeries();

    const until = within(panel).getByLabelText("Vigente hasta (opcional)");
    expect(until).toHaveValue(formatCivilDate(dayOfNextWeek(27)));
    await user.clear(until);
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body?.effectiveUntil).toBeNull();
  });

  it("gives an open series a last date", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(apiUrl(replacementPath), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return jsonResponse(replaced, 201);
      }),
    );
    const { panel, user } = await openSeries();

    expect(within(panel).getByText(noEnd)).toBeInTheDocument();
    await user.type(
      within(panel).getByLabelText("Vigente hasta (opcional)"),
      dayOfNextWeek(34),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body?.effectiveUntil).toBe(dayOfNextWeek(35)));
  });
});

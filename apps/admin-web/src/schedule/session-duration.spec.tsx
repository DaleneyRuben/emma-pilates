import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { boliviaInstant } from "../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  dayOfNextWeek,
  mondayReformer,
  mondaySchedule,
  nextMonday,
  reformer,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  valeria,
  weekSessions,
  weeklyScheduleId,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const openPanel = async (button: string | RegExp, dialog: string) => {
  const view = renderAdmin(`/?week=${nextMonday}`);
  await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });
  await view.user.click(screen.getByRole("button", { name: button }));
  const panel = await screen.findByRole("dialog", { name: dialog });
  return { ...view, panel };
};

const capture = (method: "post" | "patch", path: string) => {
  const sent: { body?: unknown } = {};
  server.use(
    http[method](apiUrl(path), async ({ request }) => {
      sent.body = await request.json();
      return jsonResponse(
        method === "post" ? { schedules: [], created: 0, skipped: 0 } : {},
        201,
      );
    }),
  );
  return sent;
};

// WEB-027 (booking ADR-0004, follow-up 98): a Session and each weekly row
// carry their own duration, starting at 60 minutes.
describe("AW03 Duración", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("creates a one-off Session for the minutes typed, starting at 60", async () => {
    const sent = capture("post", sessionsPath);
    const { panel, user } = await openPanel("Nueva sesión", "Nueva sesión");
    const duration = within(panel).getByLabelText("Duración");

    expect(duration).toHaveValue("60");
    await user.selectOptions(
      await within(panel).findByLabelText("Tipo de clase"),
      reformer.id,
    );
    await user.selectOptions(
      await within(panel).findByLabelText("Entrenadora"),
      valeria.id,
    );
    await user.type(within(panel).getByLabelText("Fecha"), dayOfNextWeek(3));
    await user.type(within(panel).getByLabelText("Hora"), "18:30");
    await user.clear(duration);
    await user.type(duration, "300");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(duration).toHaveAccessibleDescription(
      expect.stringContaining("Entre 5 y 240 minutos."),
    );

    await user.clear(duration);
    await user.type(duration, "75");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(sent.body).toEqual({
        branchId: expect.any(String),
        classTypeId: reformer.id,
        trainerStaffMemberId: valeria.id,
        startsAt: boliviaInstant(dayOfNextWeek(3), "18:30"),
        durationMinutes: 75,
        capacity: 10,
      }),
    );
  });

  it("gives each weekly row its own minutes and checks overlaps with them", async () => {
    const sent = capture("post", `${schedulesPath}/batch`);
    const { panel, user } = await openPanel("Nueva sesión", "Nueva sesión");
    await user.click(within(panel).getByLabelText("Cada semana"));
    await user.selectOptions(
      await within(panel).findByLabelText("Tipo de clase"),
      reformer.id,
    );
    await user.selectOptions(
      await within(panel).findByLabelText("Entrenadora"),
      valeria.id,
    );
    await user.selectOptions(within(panel).getByLabelText("Día, fila 1"), "1");
    await user.type(within(panel).getByLabelText("Hora, fila 1"), "07:00");
    const first = within(panel).getByLabelText("Duración, fila 1, en minutos");
    expect(first).toHaveValue("60");
    await user.clear(first);
    await user.type(first, "120");
    await user.click(
      within(panel).getByRole("button", { name: "Agregar día" }),
    );
    const second = within(panel).getByLabelText("Duración, fila 2, en minutos");
    expect(second).toHaveValue("120");
    await user.selectOptions(within(panel).getByLabelText("Día, fila 2"), "1");
    await user.clear(within(panel).getByLabelText("Hora, fila 2"));
    await user.type(within(panel).getByLabelText("Hora, fila 2"), "08:00");
    await user.type(
      within(panel).getByLabelText("Vigente desde"),
      dayOfNextWeek(0),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await within(panel).findByText("Se cruza con el lunes a las 07:00."),
    ).toBeVisible();

    await user.clear(within(panel).getByLabelText("Hora, fila 2"));
    await user.type(within(panel).getByLabelText("Hora, fila 2"), "09:00");
    await user.clear(second);
    await user.type(second, "45");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(sent.body).toMatchObject({
        rows: [
          { weekday: 1, startsAtLocal: "07:00", durationMinutes: 120 },
          { weekday: 1, startsAtLocal: "09:00", durationMinutes: 45 },
        ],
      }),
    );
  });

  it("changes one Session's minutes and sends only that", async () => {
    const sent = capture("patch", `${sessionsPath}/${mondayReformer.id}`);
    const view = renderAdmin(`/?week=${nextMonday}`);
    await view.user.click(
      await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
    const duration = within(panel).getByLabelText("Duración");

    expect(duration).toHaveValue("50");
    await view.user.clear(duration);
    await view.user.type(duration, "55");
    await view.user.click(
      within(panel).getByRole("button", { name: "Guardar" }),
    );
    await waitFor(() => expect(sent.body).toEqual({ durationMinutes: 55 }));
  });

  it("replaces the series with its own minutes", async () => {
    const sent = capture(
      "post",
      `${schedulesPath}/${weeklyScheduleId}/replacement`,
    );
    const view = renderAdmin(`/?week=${nextMonday}`);
    await view.user.click(
      await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
    await view.user.click(within(panel).getByLabelText("Esta y las futuras"));
    const duration = await within(panel).findByLabelText("Duración");

    expect(duration).toHaveValue(String(mondaySchedule.durationMinutes));
    await view.user.clear(duration);
    await view.user.type(duration, "65");
    await view.user.click(
      within(panel).getByRole("button", { name: "Guardar" }),
    );
    await waitFor(() =>
      expect(sent.body).toMatchObject({ durationMinutes: 65 }),
    );
  });
});

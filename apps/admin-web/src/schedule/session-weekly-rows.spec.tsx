import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
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
  mat,
  mondaySchedule,
  nextMonday,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const batchPath = `${schedulesPath}/batch`;

const openWeekly = async () => {
  const view = renderAdmin(`/?week=${nextMonday}`);
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
  await view.user.type(
    within(panel).getByLabelText("Vigente desde"),
    nextMonday,
  );
  return { ...view, panel };
};

const day = (panel: HTMLElement, row: number) =>
  within(panel).getByLabelText(`Día, fila ${row}`);
const hour = (panel: HTMLElement, row: number) =>
  within(panel).getByLabelText(`Hora, fila ${row}`);

describe("AW03 Cada semana with several days", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("creates every row together with its own duration and counts them in one notice", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(batchPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse(
          {
            schedules: [
              { schedule: mondaySchedule, created: 4, skipped: 0 },
              { schedule: mondaySchedule, created: 4, skipped: 1 },
              { schedule: mondaySchedule, created: 4, skipped: 0 },
            ],
          },
          201,
        );
      }),
    );
    const { panel, user } = await openWeekly();

    expect(within(panel).getByText("Días y horas")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /^Quitar / }),
    ).not.toBeInTheDocument();
    await user.selectOptions(day(panel, 1), "1");
    await user.type(hour(panel, 1), "07:00");
    await user.click(
      within(panel).getByRole("button", { name: "Agregar día" }),
    );
    expect(day(panel, 2)).toHaveValue("2");
    expect(hour(panel, 2)).toHaveValue("07:00");
    await user.selectOptions(day(panel, 2), "3");
    await user.click(
      within(panel).getByRole("button", { name: "Agregar día" }),
    );
    expect(day(panel, 3)).toHaveValue("4");
    await user.selectOptions(day(panel, 3), "5");
    await user.clear(hour(panel, 3));
    await user.type(hour(panel, 3), "18:30");
    expect(
      within(panel).getByLabelText("Duración, fila 3, en minutos"),
    ).toHaveValue("60");
    expect(
      within(panel).getByText(
        "Cada día puede durar distinto; empieza en 60 minutos.",
      ),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        branchId: centro.id,
        classTypeId: mat.id,
        trainerStaffMemberId: daniela.id,
        capacity: mat.defaultCapacity,
        effectiveFrom: nextMonday,
        rows: [
          { weekday: 1, startsAtLocal: "07:00", durationMinutes: 60 },
          { weekday: 3, startsAtLocal: "07:00", durationMinutes: 60 },
          { weekday: 5, startsAtLocal: "18:30", durationMinutes: 60 },
        ],
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "3 series semanales creadas: 12 sesiones en los próximos 30 días. 1 se omitió porque se cruzaba con otra sesión.",
    );
  });

  it("adds up to seven rows and removes any of them", async () => {
    const { panel, user } = await openWeekly();
    await user.selectOptions(day(panel, 1), "1");
    await user.type(hour(panel, 1), "07:00");
    for (let row = 2; row <= 7; row += 1) {
      await user.click(
        within(panel).getByRole("button", { name: "Agregar día" }),
      );
    }

    expect(day(panel, 7)).toHaveValue("7");
    expect(
      within(panel).queryByRole("button", { name: "Agregar día" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: "Quitar miércoles 07:00" }),
    );
    expect(
      within(panel).queryByLabelText("Día, fila 7"),
    ).not.toBeInTheDocument();
    expect(day(panel, 3)).toHaveValue("4");
    expect(
      within(panel).getByRole("button", { name: "Agregar día" }),
    ).toBeInTheDocument();
  });

  it("marks a repeated or overlapping row and sends nothing", async () => {
    let posted = false;
    server.use(
      http.post(apiUrl(batchPath), () => {
        posted = true;
        return jsonResponse({ schedules: [] }, 201);
      }),
    );
    const { panel, user } = await openWeekly();
    await user.selectOptions(day(panel, 1), "1");
    await user.type(hour(panel, 1), "07:00");
    await user.click(
      within(panel).getByRole("button", { name: "Agregar día" }),
    );
    await user.selectOptions(day(panel, 2), "1");

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(hour(panel, 2)).toHaveAccessibleDescription(
      "Ya está el lunes a las 07:00.",
    );
    expect(day(panel, 2)).toHaveAttribute("aria-invalid", "true");

    await user.clear(hour(panel, 2));
    await user.type(hour(panel, 2), "07:30");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(hour(panel, 2)).toHaveAccessibleDescription(
      "Se cruza con el lunes a las 07:00.",
    );
    expect(posted).toBe(false);
  });

  it("explains the backend's refusal of clashing rows by its code", async () => {
    server.use(
      http.post(apiUrl(batchPath), () =>
        problemResponse(409, "schedule_rows_overlap"),
      ),
    );
    const { panel, user } = await openWeekly();
    await user.selectOptions(day(panel, 1), "2");
    await user.type(hour(panel, 1), "09:00");

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Dos días se repiten o se cruzan. Revisa las filas.",
    );
  });
});

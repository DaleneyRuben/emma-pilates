import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { boliviaInstant, formatSessionMoment } from "../lib/bolivia-time";
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
  mondayReformer,
  mondaySchedule,
  nextMonday,
  reformer,
  saturdayEmpty,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  valeria,
  wednesdayMat,
  weekSessions,
  weeklyScheduleId,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const civil = (date: string) =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

const openSession = async (name: RegExp) => {
  const view = renderAdmin(`/?week=${nextMonday}`);
  await view.user.click(await screen.findByRole("button", { name }));
  const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
  return { ...view, panel };
};

describe("AW03 Editar sesión on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("changes only this Session, sending just what changed", async () => {
    let body: unknown;
    server.use(
      http.patch(
        apiUrl(`${sessionsPath}/${mondayReformer.id}`),
        async ({ request }) => {
          body = await request.json();
          return jsonResponse({});
        },
      ),
    );
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);

    expect(
      within(panel).getByText(
        `${formatSessionMoment(mondayReformer.startsAt)} · 4 de 10 lugares reservados`,
      ),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText("Solo esta sesión")).toBeChecked();
    expect(within(panel).getByText("Reformer Pilates")).toBeInTheDocument();
    expect(
      within(panel).getByLabelText("Capacidad"),
    ).toHaveAccessibleDescription(
      "No puedes bajar de 4: ya hay 4 reservas confirmadas.",
    );

    await user.selectOptions(
      await within(panel).findByLabelText("Entrenadora"),
      daniela.id,
    );
    await user.clear(within(panel).getByLabelText("Hora"));
    await user.type(within(panel).getByLabelText("Hora"), "08:00");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        trainerStaffMemberId: daniela.id,
        startsAt: boliviaInstant(dayOfNextWeek(0), "08:00"),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sesión actualizada.",
    );
  });

  it("keeps capacity at or above the booked seats, on the client and from the backend", async () => {
    server.use(
      http.patch(apiUrl(`${sessionsPath}/${mondayReformer.id}`), () =>
        problemResponse(409, "capacity_below_bookings"),
      ),
    );
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    const capacity = within(panel).getByLabelText("Capacidad");

    await user.clear(capacity);
    await user.type(capacity, "3");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(capacity).toHaveAccessibleDescription(
      expect.stringContaining("Debe ser al menos 4."),
    );

    await user.clear(capacity);
    await user.type(capacity, "5");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(capacity).toHaveAccessibleDescription(
        expect.stringContaining("No puedes bajar de las reservas confirmadas."),
      ),
    );
  });

  it("replaces the weekly schedule from a Vigente desde date and reports the kept Sessions", async () => {
    let body: unknown;
    server.use(
      http.post(
        apiUrl(`${schedulesPath}/${weeklyScheduleId}/replacement`),
        async ({ request }) => {
          body = await request.json();
          return jsonResponse(
            {
              ended: mondaySchedule,
              replacement: mondaySchedule,
              cancelledSessions: 3,
              keptSessions: 1,
              created: 4,
              skipped: 0,
            },
            201,
          );
        },
      ),
    );
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);

    await user.click(within(panel).getByLabelText("Esta y las futuras"));
    expect(await within(panel).findByLabelText("Día de la semana")).toHaveValue(
      "1",
    );
    expect(within(panel).getByLabelText("Vigente desde")).toHaveValue(
      dayOfNextWeek(0),
    );
    expect(
      within(panel).getByText(
        "Las sesiones que ya tienen reservas o lista de espera se mantienen sin cambios.",
      ),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Hora"));
    await user.type(within(panel).getByLabelText("Hora"), "07:30");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        branchId: centro.id,
        classTypeId: reformer.id,
        trainerStaffMemberId: valeria.id,
        weekday: 1,
        startsAtLocal: "07:30",
        capacity: 10,
        effectiveFrom: dayOfNextWeek(0),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      `Serie actualizada desde el ${civil(dayOfNextWeek(0))}: 4 sesiones nuevas; 3 sin reservas se reemplazaron y 1 con reservas se mantiene sin cambios.`,
    );
  });

  it("ends the weekly schedule from a date after confirming", async () => {
    let body: unknown;
    server.use(
      http.post(
        apiUrl(`${schedulesPath}/${weeklyScheduleId}/end`),
        async ({ request }) => {
          body = await request.json();
          return jsonResponse({
            schedule: mondaySchedule,
            cancelledSessions: 2,
            keptSessions: 1,
          });
        },
      ),
    );
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    await user.click(within(panel).getByLabelText("Esta y las futuras"));

    await user.click(
      await within(panel).findByRole("button", { name: "Terminar la serie" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Terminar esta serie semanal?",
    });
    expect(
      within(confirm).getByLabelText("Deja de repetirse desde"),
    ).toHaveValue(dayOfNextWeek(0));
    await user.click(
      within(confirm).getByRole("button", { name: "Terminar serie" }),
    );

    await waitFor(() =>
      expect(body).toEqual({ effectiveFrom: dayOfNextWeek(0) }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      `La serie deja de repetirse desde el ${civil(dayOfNextWeek(0))}: 2 sesiones sin reservas se cancelaron y 1 con reservas se mantiene.`,
    );
  });

  it("cancels a booked Session as a last resort, naming the refunds and the notified waitlist", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl(`${sessionsPath}/${wednesdayMat.id}/cancel`), () => {
        calls += 1;
        return calls === 1
          ? problemResponse(409, "session_not_cancellable")
          : jsonResponse({ affectedBookings: 10 });
      }),
    );
    const { panel, user } = await openSession(/Mat Pilates, 16:00/);

    expect(
      within(panel).getByText(
        `${formatSessionMoment(wednesdayMat.startsAt)} · 10 de 10 lugares reservados · 3 en lista de espera`,
      ),
    ).toBeInTheDocument();
    expect(within(panel).queryByLabelText("Esta y las futuras")).toBeNull();

    const cancel = async () => {
      await user.click(
        within(panel).getByRole("button", { name: "Cancelar sesión" }),
      );
      const confirm = await screen.findByRole("alertdialog", {
        name: "¿Cancelar esta sesión?",
      });
      expect(
        within(confirm).getByText(
          "Se cancelan las 10 reservas y cada clienta recupera su clase, aunque falten menos de 2 h 30. Avisamos a cada clienta y a las 3 personas en lista de espera. No se puede deshacer.",
        ),
      ).toBeInTheDocument();
      await user.click(
        within(confirm).getByRole("button", { name: "Cancelar sesión" }),
      );
    };

    await cancel();
    expect(
      await within(panel).findByText(
        "Esta sesión ya no se puede cancelar: empezó o ya fue cancelada.",
      ),
    ).toBeInTheDocument();

    await cancel();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sesión cancelada: 10 reservas reembolsadas y avisos enviados.",
    );
  });

  it("explains that an empty Session cancels itself instead of offering cancellation", async () => {
    const { panel } = await openSession(/Reformer Pilates, 09:00/);

    expect(
      within(panel).queryByRole("button", { name: "Cancelar sesión" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Sin reservas: si sigue vacía, el sistema la cancela sola 2 horas antes de empezar.",
      ),
    ).toBeInTheDocument();
    expect(saturdayEmpty.bookedCount).toBe(0);
  });
});

describe("AW03 Editar sesión on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("opens as a full-screen sheet", async () => {
    const { panel } = await openSession(/Reformer Pilates, 07:00/);
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
  });
});

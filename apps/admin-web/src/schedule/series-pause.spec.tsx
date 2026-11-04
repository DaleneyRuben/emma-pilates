import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, formatLongDay } from "../lib/bolivia-time";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  dayOfNextWeek,
  mondaySchedule,
  nextMonday,
  schedulesPath,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
  weeklyScheduleId,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const seriesPath = `${schedulesPath}/${weeklyScheduleId}`;
// «23 de diciembre»: the long day without its weekday.
const dayMonth = (date: string) => formatLongDay(date).replace(/^\S+ /, "");

const openSeriesClass = async () => {
  const view = renderAdmin(`/horario?week=${nextMonday}`);
  await view.user.click(
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
  );
  const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
  return { ...view, panel };
};

// BKM-018 and follow-up 234 (P02b): pause a weekly series without ending it.
describe("AW03 pausing a weekly series", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("pauses the series from a date until its return date", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(`${seriesPath}/pause`), async ({ request }) => {
        body = await request.json();
        return jsonResponse({
          schedule: mondaySchedule,
          cancelledSessions: 2,
          keptSessions: 0,
        });
      }),
    );
    const { panel, user } = await openSeriesClass();

    await user.click(
      await within(panel).findByRole("button", { name: "Pausar la serie" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "Pausar la serie",
    });
    expect(
      within(dialog).getByText(
        "En esas fechas no se publican clases de la serie. Las que ya tienen reservas se mantienen; cancélalas una por una si hace falta.",
      ),
    ).toBeInTheDocument();
    await user.type(
      within(dialog).getByLabelText("Pausar desde"),
      dayOfNextWeek(14),
    );
    await user.type(
      within(dialog).getByLabelText("Vuelve el (opcional)"),
      dayOfNextWeek(28),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Pausar la serie" }),
    );

    await waitFor(() =>
      expect(body).toEqual({
        pausedFrom: dayOfNextWeek(14),
        pausedUntil: dayOfNextWeek(28),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      `Serie en pausa · vuelve el ${formatLongDay(dayOfNextWeek(28))}`,
    );
  });

  it("pauses until resumed when no return date is chosen", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(`${seriesPath}/pause`), async ({ request }) => {
        body = await request.json();
        return jsonResponse({
          schedule: mondaySchedule,
          cancelledSessions: 0,
          keptSessions: 0,
        });
      }),
    );
    const { panel, user } = await openSeriesClass();

    await user.click(
      await within(panel).findByRole("button", { name: "Pausar la serie" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "Pausar la serie",
    });
    await user.type(
      within(dialog).getByLabelText("Pausar desde"),
      dayOfNextWeek(14),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Pausar la serie" }),
    );

    await waitFor(() =>
      expect(body).toEqual({
        pausedFrom: dayOfNextWeek(14),
        pausedUntil: null,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Serie en pausa hasta que la reanudes",
    );
  });

  it("shows a paused series and resumes it", async () => {
    let resumed = false;
    server.use(
      http.get(apiUrl(schedulesPath), () =>
        jsonResponse([
          {
            ...mondaySchedule,
            pausedFrom: dayOfNextWeek(14),
            pausedUntil: dayOfNextWeek(28),
          },
        ]),
      ),
      http.post(apiUrl(`${seriesPath}/resume`), () => {
        resumed = true;
        return jsonResponse({
          schedule: mondaySchedule,
          restoredSessions: 2,
          created: 0,
        });
      }),
    );
    const { panel, user } = await openSeriesClass();

    expect(
      await within(panel).findByText(
        `En pausa del ${dayMonth(dayOfNextWeek(14))} al ${dayMonth(addDays(dayOfNextWeek(28), -1))}.`,
      ),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Serie en pausa")).toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: "Reanudar la serie" }),
    );

    await waitFor(() => expect(resumed).toBe(true));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Serie reanudada · sus clases vuelven a la app",
    );
  });

  it("names an open-ended pause and the backend's refusal", async () => {
    server.use(
      http.get(apiUrl(schedulesPath), () =>
        jsonResponse([
          {
            ...mondaySchedule,
            pausedFrom: dayOfNextWeek(14),
            pausedUntil: null,
          },
        ]),
      ),
      http.post(apiUrl(`${seriesPath}/resume`), () =>
        problemResponse(409, "session_schedule_not_paused"),
      ),
    );
    const { panel, user } = await openSeriesClass();

    expect(
      await within(panel).findByText(
        `En pausa desde el ${dayMonth(dayOfNextWeek(14))}, hasta que la reanudes.`,
      ),
    ).toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: "Reanudar la serie" }),
    );

    expect(
      await within(panel).findByText(
        "Esta serie ya no está en pausa. Cierra el panel y actualiza el horario.",
      ),
    ).toBeInTheDocument();
  });
});

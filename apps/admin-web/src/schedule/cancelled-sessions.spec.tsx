import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  boliviaInstant,
  boliviaParts,
  formatLongDay,
} from "../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  dayOfNextWeek,
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  wednesdayMat,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const cancelledAt = boliviaInstant(dayOfNextWeek(2), "13:00");
const minimumNotMet = {
  ...wednesdayMat,
  bookedCount: 0,
  availableSeats: 10,
  waitlistCount: 0,
  cancellation: { cause: "minimum_not_met", cancelledAt, bookedCount: 1 },
};
const byTheStudio = {
  ...mondayReformer,
  id: "1e000000-0000-5000-8000-000000000071",
  startsAt: boliviaInstant(dayOfNextWeek(3), "18:30"),
  endsAt: boliviaInstant(dayOfNextWeek(3), "19:20"),
  bookedCount: 0,
  cancellation: {
    cause: "studio",
    cancelledAt: boliviaInstant(dayOfNextWeek(1), "10:12"),
    bookedCount: 3,
  },
};
const paused = {
  ...mondayReformer,
  id: "1e000000-0000-5000-8000-000000000072",
  startsAt: boliviaInstant(dayOfNextWeek(5), "10:00"),
  endsAt: boliviaInstant(dayOfNextWeek(5), "10:50"),
  bookedCount: 0,
  cancellation: {
    cause: "schedule_paused",
    cancelledAt: boliviaInstant(dayOfNextWeek(0), "09:00"),
    bookedCount: 0,
  },
};
const week = [mondayReformer, minimumNotMet, byTheStudio, paused];

describe("FIX-042 cancelled classes stay in the Horario", () => {
  useMockServer();
  let asked: URLSearchParams | null;
  beforeEach(() => {
    asked = null;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), ({ request }) => {
        asked = new URL(request.url).searchParams;
        return jsonResponse(week);
      }),
    );
  });

  it("asks for the week's cancelled classes and draws each in its place with its cause", async () => {
    renderAdmin(`/horario?week=${nextMonday}`);

    const minimum = await screen.findByRole("button", {
      name: "Mat Pilates, 16:00, Daniela Ortiz, Cancelada · mínimo no alcanzado",
    });
    expect(asked?.get("includeCancelled")).toBe("true");
    expect(minimum).toHaveTextContent("Cancelada · mínimo");
    expect(
      screen.getByRole("button", {
        name: "Reformer Pilates, 18:30, Valeria Peña, Cancelada por el estudio",
      }),
    ).toHaveTextContent("Cancelada · estudio");
    expect(
      screen.getByRole("button", {
        name: "Reformer Pilates, 10:00, Valeria Peña, Serie en pausa",
      }),
    ).toHaveTextContent("Serie en pausa");
  });

  it("opens a class the minimum check cancelled read-only, with when and how many it had", async () => {
    const { user } = renderAdmin(`/horario?week=${nextMonday}`);
    await user.click(
      await screen.findByRole("button", {
        name: /Mat Pilates, 16:00, .*Cancelada · mínimo no alcanzado/,
      }),
    );

    const panel = await screen.findByRole("dialog", {
      name: "Clase cancelada",
    });
    expect(
      within(panel).getByText("Cancelada · mínimo no alcanzado"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(
        `Se canceló sola el ${formatLongDay(dayOfNextWeek(2))} a las ${boliviaParts(cancelledAt).time}: no llegó al mínimo de reservas. Las clientas que reservaron recuperaron su clase.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("1 de 10 al cancelarse"),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(
      within(panel).queryByRole("button", { name: /Reservar/ }),
    ).toBeNull();
  });

  it("says when the studio cancelled a class, and why a paused one is not published", async () => {
    const { user } = renderAdmin(`/horario?week=${nextMonday}`);
    await user.click(
      await screen.findByRole("button", {
        name: /Reformer Pilates, 18:30, .*Cancelada por el estudio/,
      }),
    );
    let panel = await screen.findByRole("dialog", { name: "Clase cancelada" });
    expect(
      within(panel).getByText(
        `La canceló el estudio el ${formatLongDay(dayOfNextWeek(1))} a las 10:12. Las clientas que reservaron recuperaron su clase y les llegó un aviso.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("3 de 10 al cancelarse"),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Cerrar" }));

    await user.click(
      await screen.findByRole("button", {
        name: /Reformer Pilates, 10:00, .*Serie en pausa/,
      }),
    );
    panel = await screen.findByRole("dialog", { name: "Clase cancelada" });
    expect(
      within(panel).getByText(
        "Esta clase no se publica: su serie está en pausa.",
      ),
    ).toBeInTheDocument();
  });

  describe("on a phone", () => {
    useNarrowViewport();

    it("lists a cancelled class in its day with its cause", async () => {
      const { user } = renderAdmin(`/horario?week=${nextMonday}`);
      await user.click(await screen.findByRole("tab", { name: /mié/i }));
      expect(
        await screen.findByRole("button", {
          name: /Mat Pilates, 16:00, .*Cancelada · mínimo no alcanzado/,
        }),
      ).toBeInTheDocument();
    });
  });
});

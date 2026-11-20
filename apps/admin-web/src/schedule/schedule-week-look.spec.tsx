import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { boliviaInstant, boliviaToday, weekStartOf } from "../lib/bolivia-time";
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

const cancelled = {
  ...wednesdayMat,
  bookedCount: 0,
  availableSeats: 10,
  waitlistCount: 0,
  cancellation: {
    cause: "minimum_not_met",
    cancelledAt: boliviaInstant(dayOfNextWeek(2), "13:00"),
    bookedCount: 1,
  },
};

// FIX-091 W2 (Horario B), verification 2026-11-20 and Rosa Emma (RW-horario):
// today's header solid Rosa profundo over a soft 50 column (no strong Rubor
// fill), each class in two lines, and each cancelled class as one thin line
// in its place, still opening its read-only view.
describe("W2 Horario: today marked softly, compact classes, cancelled lines", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("marks today with a solid header over a soft column", async () => {
    server.use(http.get(apiUrl(sessionsPath), () => jsonResponse([])));
    renderAdmin(`/horario?week=${weekStartOf(boliviaToday())}`);

    const week = await screen.findByRole("table", { name: "Semana" });
    const headers = within(week).getAllByRole("columnheader");
    const cells = within(week).getAllByRole("cell");
    const todayIndex = headers.findIndex((header) =>
      header.textContent?.includes("hoy"),
    );
    expect(todayIndex).toBeGreaterThanOrEqual(0);
    expect(headers[todayIndex]).toHaveClass("bg-primario", "text-blanco");
    expect(cells[todayIndex]).toHaveClass("bg-superficie-hundida");
    expect(cells[todayIndex]).not.toHaveClass("bg-rosa-200");
    const otherDay = (todayIndex + 1) % 7;
    expect(headers[otherDay]).toHaveClass("bg-superficie");
    expect(cells[otherDay]).not.toHaveClass("bg-superficie-hundida");
  });

  it("draws a class in two lines: its type, then the trainer and the places", async () => {
    server.use(
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([mondayReformer, wednesdayMat]),
      ),
    );
    renderAdmin(`/horario?week=${nextMonday}`);

    const reformer = await screen.findByRole("button", {
      name: /^Reformer Pilates, 07:00/,
    });
    const lines = within(reformer).getAllByText(/./, {
      selector: "span[data-line]",
    });
    expect(lines.map((line) => line.textContent)).toEqual([
      "Reformer Pilates",
      `${mondayReformer.trainerName.split(" ")[0]} · 4 de 8`,
    ]);
    const full = screen.getByRole("button", { name: /^Mat Pilates, 16:00/ });
    expect(
      within(full)
        .getAllByText(/./, { selector: "span[data-line]" })
        .map((line) => line.textContent),
    ).toEqual([
      "Mat Pilates",
      `${wednesdayMat.trainerName.split(" ")[0]} · Llena · 3 en espera`,
    ]);
  });

  it("draws a cancelled class as one thin line that still opens it", async () => {
    server.use(
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([mondayReformer, cancelled]),
      ),
    );
    const { user } = renderAdmin(`/horario?week=${nextMonday}`);

    const line = await screen.findByRole("button", {
      name: "Mat Pilates, 16:00, Daniela Ortiz, Cancelada · mínimo no alcanzado",
    });
    expect(line).toHaveTextContent(/^cancelada · mínimo$/);
    expect(line).toHaveAttribute("data-cancelled", "line");
    expect(line.style.height).toBe("22px");
    expect(
      screen.getByText("Las canceladas quedan como una línea fina."),
    ).toBeInTheDocument();

    await user.click(line);
    expect(
      await screen.findByRole("dialog", { name: "Clase cancelada" }),
    ).toBeInTheDocument();
  });

  it("leaves the legend out of a week with nothing cancelled", async () => {
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse([mondayReformer])),
    );
    renderAdmin(`/horario?week=${nextMonday}`);

    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });
    expect(
      screen.queryByText("Las canceladas quedan como una línea fina."),
    ).toBeNull();
  });

  describe("on a phone", () => {
    useNarrowViewport();

    it("lists a cancelled class as one line with its time and type", async () => {
      server.use(
        http.get(apiUrl(sessionsPath), () => jsonResponse([cancelled])),
      );
      const { user } = renderAdmin(`/horario?week=${nextMonday}`);
      await user.click(await screen.findByRole("tab", { name: /mié/i }));

      const line = await screen.findByRole("button", {
        name: /Mat Pilates, 16:00, .*Cancelada · mínimo no alcanzado/,
      });
      expect(line).toHaveTextContent(
        /^16:00 · Mat Pilates · cancelada · mínimo$/,
      );
    });

    it("rings today's day tab on 50 while another day is shown", async () => {
      server.use(http.get(apiUrl(sessionsPath), () => jsonResponse([])));
      const today = boliviaToday();
      const { user } = renderAdmin(`/horario?week=${weekStartOf(today)}`);
      const tabs = await screen.findAllByRole("tab");
      const todayTab = tabs.find((tab) => tab.textContent?.includes("hoy"));
      const other = tabs.find((tab) => !tab.textContent?.includes("hoy"));
      if (todayTab === undefined || other === undefined) throw new Error();
      await user.click(other);
      expect(todayTab).toHaveAttribute("aria-selected", "false");
      expect(todayTab).toHaveClass("bg-superficie-hundida");
      expect(todayTab).not.toHaveClass("bg-rosa-200");
    });
  });
});

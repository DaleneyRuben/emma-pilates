import {
  boliviaCivilDate,
  civilDateRange,
  agendaDayChipLabel,
  dayChipLabel,
  formatCancellationDeadline,
  formatMonthHeading,
  formatSessionDate,
  formatStartTime,
  formatTimeRange,
  hasStarted,
  isInsideCancellationWindow,
  upcomingCivilDates,
} from "./session-format";

describe("Session formatting", () => {
  it("treats the configured minutes before a Session as the Cancellation Window", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");

    expect(isInsideCancellationWindow("2026-09-21T14:30:00.000Z", now, 150)).toBe(true);
    expect(isInsideCancellationWindow("2026-09-21T14:30:00.001Z", now, 150)).toBe(false);
    expect(isInsideCancellationWindow("2026-09-21T11:00:00.000Z", now, 150)).toBe(true);
  });

  // BKM-004: the window is a Studio Setting, so changing it moves the edge.
  it("follows a changed Cancellation Window", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");

    expect(isInsideCancellationWindow("2026-09-21T15:00:00.000Z", now, 150)).toBe(false);
    expect(isInsideCancellationWindow("2026-09-21T15:00:00.000Z", now, 240)).toBe(true);
  });

  // MOB-044: a Session that has started can no longer be booked or cancelled.
  it("tells a started Session from an upcoming one", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");
    expect(hasStarted("2026-09-21T12:00:00.000Z", now)).toBe(true);
    expect(hasStarted("2026-09-21T11:00:00.000Z", now)).toBe(true);
    expect(hasStarted("2026-09-21T12:00:00.001Z", now)).toBe(false);
  });

  it("derives the Bolivia civil date from an instant", () => {
    expect(boliviaCivilDate(new Date("2026-09-21T03:30:00.000Z"))).toBe("2026-09-20");
    expect(boliviaCivilDate(new Date("2026-09-21T04:00:00.000Z"))).toBe("2026-09-21");
  });

  it("lists the next seven civil dates starting today", () => {
    const dates = upcomingCivilDates("2026-09-28", 7);

    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-09-28");
    expect(dates[3]).toBe("2026-10-01");
  });

  it("labels day chips with the Spanish weekday and day number", () => {
    expect(dayChipLabel("2026-09-21")).toEqual({ weekday: "lun", day: "21" });
    expect(dayChipLabel("2026-09-27")).toEqual({ weekday: "dom", day: "27" });
  });

  it("labels a civil date as S02 writes a day chip", () => {
    expect(agendaDayChipLabel("2026-10-21")).toEqual({ weekday: "Mié", day: "21" });
    expect(agendaDayChipLabel("2026-10-24")).toEqual({ weekday: "Sáb", day: "24" });
    expect(agendaDayChipLabel("2026-10-25")).toEqual({ weekday: "Dom", day: "25" });
    expect(agendaDayChipLabel("2026-10-19")).toEqual({ weekday: "Lun", day: "19" });
  });

  it("converts a civil date into the instant range the API expects", () => {
    expect(civilDateRange("2026-09-21")).toEqual({
      from: "2026-09-21T04:00:00.000Z",
      until: "2026-09-22T04:00:00.000Z",
    });
  });

  it("labels history months in capitalized Spanish", () => {
    expect(formatMonthHeading("2026-09-05T13:00:00.000Z")).toBe("Septiembre 2026");
    expect(formatMonthHeading("2026-08-19T11:00:00.000Z")).toBe("Agosto 2026");
  });

  it("formats Bolivia time ranges and long dates", () => {
    expect(formatTimeRange("2026-09-21T11:00:00.000Z", "2026-09-21T11:50:00.000Z")).toBe(
      "07:00 – 07:50",
    );
    expect(formatSessionDate("2026-09-21T11:00:00.000Z")).toBe("lunes 21 de septiembre");
  });

  it("writes a Session's start alone in La Paz time, as Inicio's next class does", () => {
    expect(formatStartTime("2026-09-21T12:00:00.000Z")).toBe("08:00");
  });

  // Walkthrough n.º 27: the free-cancellation limit names its day, in La Paz.
  describe("the free-cancellation deadline", () => {
    // Friday 6 November 2026, La Paz (UTC−4).
    const at = (local: string) => new Date(`${local}-04:00`);

    it("says «hoy» when the deadline falls today", () => {
      expect(formatCancellationDeadline(at("2026-11-06T05:30:00"), at("2026-11-06T01:00:00"))).toBe(
        "hoy a las 05:30",
      );
    });

    it("says «mañana» when the deadline falls tomorrow", () => {
      expect(formatCancellationDeadline(at("2026-11-07T05:30:00"), at("2026-11-06T20:00:00"))).toBe(
        "mañana a las 05:30",
      );
    });

    it("names the weekday and the day otherwise", () => {
      expect(formatCancellationDeadline(at("2026-11-07T05:30:00"), at("2026-11-05T09:00:00"))).toBe(
        "el sáb 7 a las 05:30",
      );
    });

    it("counts days in La Paz, not in UTC, around midnight", () => {
      // 19:00 and 22:00 in La Paz are 23:00 and 02:00 the next day in UTC.
      expect(formatCancellationDeadline(at("2026-11-06T22:00:00"), at("2026-11-06T19:00:00"))).toBe(
        "hoy a las 22:00",
      );
      // One minute before midnight, a deadline just after it is tomorrow.
      expect(formatCancellationDeadline(at("2026-11-07T00:00:00"), at("2026-11-06T23:59:00"))).toBe(
        "mañana a las 00:00",
      );
      // Just after midnight, the same instant is today.
      expect(formatCancellationDeadline(at("2026-11-07T00:30:00"), at("2026-11-07T00:01:00"))).toBe(
        "hoy a las 00:30",
      );
    });
  });
});

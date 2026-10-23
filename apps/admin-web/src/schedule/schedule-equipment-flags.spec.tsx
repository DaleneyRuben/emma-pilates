import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { boliviaInstant } from "../lib/bolivia-time";
import { centro } from "../test/booking-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  mondayReformer,
  nextMonday,
  saturdayEmpty,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const flagsPath = "/api/v1/administrator/equipment-flags";
const flagReads: URLSearchParams[] = [];
const flags = (body: unknown[]) =>
  http.get(apiUrl(flagsPath), ({ request }) => {
    flagReads.push(new URL(request.url).searchParams);
    return jsonResponse(body);
  });
const reformerShort = [
  {
    sessionId: mondayReformer.id,
    kind: "reformer",
    capacity: 10,
    workingCount: 7,
  },
  {
    sessionId: saturdayEmpty.id,
    kind: "reformer",
    capacity: 10,
    workingCount: 7,
  },
];

const showWeek = () => {
  server.use(http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)));
  renderAdmin(`/?week=${nextMonday}`);
};

// BKO-004, follow-up 170: Horario flags the Sessions with more places than
// working Equipment of their kind; it never changes a capacity itself.
describe("AW02 equipment flags", () => {
  useMockServer();
  beforeEach(() => {
    flagReads.length = 0;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("marks each flagged Session and says how many are short above the week", async () => {
    server.use(flags(reformerShort));
    showWeek();

    const flagged = await screen.findByRole("button", {
      name: "Reformer Pilates, 07:00, Valeria Peña, 4 de 10 lugares, faltan equipos: 7 reformers funcionando para 10 lugares",
    });
    expect(within(flagged).getByText("Faltan equipos")).toBeInTheDocument();
    expect(
      screen.getByText(
        "2 sesiones de esta semana tienen más lugares que reformers funcionando. Baja su capacidad o revisa",
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText(/^2 sesiones/)).getByRole("link", {
        name: "Equipos",
      }),
    ).toHaveAttribute("href", "/back-office/equipos");
    expect(
      screen.getByRole("button", {
        name: "Mat Pilates, 16:00, Daniela Ortiz, 10 de 10 lugares, 3 en lista de espera",
      }),
    ).toBeInTheDocument();
    expect(flagReads[0]?.get("branchId")).toBe(centro.id);
    expect(flagReads[0]?.get("from")).toBe(boliviaInstant(nextMonday, "00:00"));
  });

  it("names one Session in the singular and shows no notice without flags", async () => {
    server.use(flags(reformerShort.slice(0, 1)));
    showWeek();
    expect(
      await screen.findByText(
        "1 sesión de esta semana tiene más lugares que reformers funcionando. Baja su capacidad o revisa",
        { exact: false },
      ),
    ).toBeInTheDocument();
  });

  it("stays quiet when nothing is short", async () => {
    showWeek();
    await screen.findByRole("button", {
      name: "Reformer Pilates, 07:00, Valeria Peña, 4 de 10 lugares",
    });
    expect(screen.queryByText(/Baja su capacidad/)).not.toBeInTheDocument();
  });

  describe("on a narrow browser", () => {
    useNarrowViewport();

    it("marks the flagged card of the day list", async () => {
      server.use(flags(reformerShort));
      showWeek();
      const card = await screen.findByRole("button", {
        name: /^Reformer Pilates, 07:00, .*faltan equipos/,
      });
      expect(within(card).getByText("Faltan equipos")).toBeInTheDocument();
    });
  });
});

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
    typeId: "e9000000-0000-5000-8000-000000000001",
    typeName: "Reformer",
    kind: "reformer",
    capacity: 10,
    workingCount: 7,
  },
  {
    sessionId: saturdayEmpty.id,
    typeId: "e9000000-0000-5000-8000-000000000001",
    typeName: "Reformer",
    kind: "reformer",
    capacity: 10,
    workingCount: 7,
  },
];

const showWeek = () => {
  server.use(http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)));
  return renderAdmin(`/horario?week=${nextMonday}`);
};

// BKO-004, follow-up 170: Horario flags the Sessions with more places than
// working Equipment of their kind; it never changes a capacity itself.
describe("AW02 equipment flags", () => {
  useMockServer();
  beforeEach(() => {
    flagReads.length = 0;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("marks each flagged Session with a dot and says how many are short in one line", async () => {
    server.use(flags(reformerShort));
    showWeek();

    const flagged = await screen.findByRole("button", {
      name: "Reformer Pilates, 07:00, Valeria Peña, 4 de 10 lugares, faltan equipos: 7 equipos Reformer funcionando para 10 lugares",
    });
    // FIX-084 (Horario A): one small amber dot, no warning line in the block.
    expect(within(flagged).getByTestId("equipment-dot")).toBeInTheDocument();
    expect(
      within(flagged).queryByText(/Faltan equipos/),
    ).not.toBeInTheDocument();
    const notice = screen.getByRole("status", {
      name: "2 clases con más lugares que equipos",
    });
    expect(notice).toHaveTextContent(
      "2 clases con más lugares que equipos · Revisar",
    );
    expect(
      within(notice).getByRole("link", { name: "Revisar" }),
    ).toHaveAttribute("href", "/estudio/equipos");
    expect(
      screen.getByRole("button", {
        name: "Mat Pilates, 16:00, Daniela Ortiz, 10 de 10 lugares, 3 en lista de espera",
      }),
    ).toBeInTheDocument();
    expect(flagReads[0]?.get("branchId")).toBe(centro.id);
    expect(flagReads[0]?.get("from")).toBe(boliviaInstant(nextMonday, "00:00"));
  });

  it("names one class in the singular", async () => {
    server.use(flags(reformerShort.slice(0, 1)));
    showWeek();
    expect(
      await screen.findByRole("status", {
        name: "1 clase con más lugares que equipos",
      }),
    ).toBeInTheDocument();
  });

  it("explains the shortage, with the studio's type, in the session panel", async () => {
    server.use(
      flags([
        reformerShort[0]!,
        {
          ...reformerShort[1]!,
          typeId: "e9000000-0000-5000-8000-000000000077",
          typeName: "Silla",
          kind: null,
        },
      ]),
    );
    const { user } = showWeek();
    expect(
      await screen.findByRole("button", {
        name: /faltan equipos: 7 equipos Silla funcionando para 10 lugares$/,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: /^Reformer Pilates, 07:00, .*faltan equipos: 7 equipos Reformer/,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "Faltan equipos: 7 equipos Reformer funcionando para 10 lugares. Baja su capacidad o revisa",
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Equipos" }),
    ).toHaveAttribute("href", "/estudio/equipos");
  });

  it("stays quiet when nothing is short", async () => {
    showWeek();
    await screen.findByRole("button", {
      name: "Reformer Pilates, 07:00, Valeria Peña, 4 de 10 lugares",
    });
    expect(
      screen.queryByText(/con más lugares que equipos/),
    ).not.toBeInTheDocument();
  });

  describe("on a narrow browser", () => {
    useNarrowViewport();

    it("marks the flagged card of the day list", async () => {
      server.use(flags(reformerShort));
      showWeek();
      const card = await screen.findByRole("button", {
        name: /^Reformer Pilates, 07:00, .*faltan equipos/,
      });
      expect(within(card).getByTestId("equipment-dot")).toBeInTheDocument();
    });
  });
});

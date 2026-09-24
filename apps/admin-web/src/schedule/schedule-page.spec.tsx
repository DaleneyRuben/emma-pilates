import { screen, waitFor, within } from "@testing-library/react";
import { delay, http } from "msw";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  formatWeekRange,
  weekStartOf,
} from "../lib/bolivia-time";
import {
  activeBranchesHandler,
  centro,
  equipetrol,
} from "../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const reads: URLSearchParams[] = [];
const sessionReads = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(sessionsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });
const weekOf = (params: URLSearchParams) =>
  params.get("branchId") === centro.id &&
  params.get("from") === boliviaInstant(nextMonday, "00:00")
    ? weekSessions
    : [];

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Horario" });

describe("AW02 Horario on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("draws the selected Branch's week in Bolivia time with occupancy and the waitlist", async () => {
    server.use(sessionReads((params) => jsonResponse(weekOf(params))));
    renderAdmin(`/?week=${nextMonday}`);
    await heading();

    expect(
      await screen.findByText(
        "Sucursal Centro · sala única · 3 sesiones esta semana",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(formatWeekRange(nextMonday))).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Reformer Pilates, 07:00, Valeria Peña, 4 de 10 lugares",
      }),
    ).toBeInTheDocument();
    const full = screen.getByRole("button", {
      name: "Mat Pilates, 16:00, Daniela Ortiz, 10 de 10 lugares, 3 en lista de espera",
    });
    expect(within(full).getByText("Llena · 3 en espera")).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toHaveLength(7);

    const read = reads.find((params) => params.get("branchId") === centro.id);
    expect(read?.get("from")).toBe(boliviaInstant(nextMonday, "00:00"));
    expect(read?.get("until")).toBe(
      boliviaInstant(addDays(nextMonday, 7), "00:00"),
    );
    expect(read?.get("limit")).toBe("100");
  });

  it("moves between weeks through the address", async () => {
    server.use(sessionReads((params) => jsonResponse(weekOf(params))));
    const { router, user } = renderAdmin(`/?week=${nextMonday}`);
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });

    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(
      await screen.findByText("No hay sesiones programadas esta semana."),
    ).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.search).toEqual({
      week: addDays(nextMonday, 7),
    });

    await user.click(screen.getByRole("button", { name: "Hoy" }));
    await waitFor(() =>
      expect(router.state.matches.at(-1)?.search).toEqual({
        week: weekStartOf(boliviaToday()),
      }),
    );
  });

  it("reloads the grid for the Branch chosen in the top bar", async () => {
    server.use(sessionReads((params) => jsonResponse(weekOf(params))));
    const { user } = renderAdmin(`/?week=${nextMonday}`);
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    expect(
      await screen.findByText(
        "Sucursal Equipetrol · sala única · 0 sesiones esta semana",
      ),
    ).toBeInTheDocument();
    expect(reads.map((params) => params.get("branchId"))).toContain(
      equipetrol.id,
    );
  });

  it("shows the loading line after a Branch switch, never the previous Branch's grid", async () => {
    // The first matching handler of one server.use call answers.
    server.use(
      http.get(apiUrl(sessionsPath), async ({ request }) => {
        if (
          new URL(request.url).searchParams.get("branchId") !== equipetrol.id
        ) {
          return undefined;
        }
        await delay("infinite");
        return jsonResponse([]);
      }),
      sessionReads((params) => jsonResponse(weekOf(params))),
    );
    const { user } = renderAdmin(`/?week=${nextMonday}`);
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    expect(await screen.findByText("Cargando el horario…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reformer Pilates, 07:00/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Sucursal Equipetrol · sala única"),
    ).toBeInTheDocument();
  });

  it("shows the loading, failed, and forbidden states of the week", async () => {
    server.use(
      sessionReads(() => problemResponse(403, "booking_access_denied")),
    );
    renderAdmin(`/?week=${nextMonday}`);

    expect(await screen.findByText("Cargando el horario…")).toBeInTheDocument();
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nueva sesión" }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the week cannot load", async () => {
    server.use(sessionReads(() => problemResponse(400, "invalid_request")));
    renderAdmin(`/?week=${nextMonday}`);
    expect(
      await screen.findByText("No pudimos cargar el horario."),
    ).toBeInTheDocument();
  });

  it("asks for a Branch first when none is active", async () => {
    server.use(activeBranchesHandler([]));
    renderAdmin(`/?week=${nextMonday}`);
    await heading();

    expect(
      await screen.findByText(
        "Todavía no hay sucursales activas. Crea una en Sucursales para armar su horario.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nueva sesión" }),
    ).not.toBeInTheDocument();
  });

  it("says so when the week reached the backend's cap instead of hiding Sessions", async () => {
    const crowded = Array.from({ length: 100 }, (_, index) => ({
      ...weekSessions[0]!,
      id: `1e000000-0000-5000-8000-0000000${String(index).padStart(5, "0")}`,
    }));
    server.use(sessionReads(() => jsonResponse(crowded)));
    renderAdmin(`/?week=${nextMonday}`);

    expect(
      await screen.findByText(
        "Se muestran las primeras 100 sesiones de la semana.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Sucursal Centro · sala única · 100 sesiones esta semana",
      ),
    ).toBeVisible();
  });

  it("starts on the current Bolivia week when the address names none", async () => {
    server.use(sessionReads(() => jsonResponse([])));
    const { router } = renderAdmin("/");
    await heading();
    await waitFor(() => expect(reads.length).toBeGreaterThan(0));
    expect(reads[0]?.get("from")).toBe(
      boliviaInstant(weekStartOf(boliviaToday()), "00:00"),
    );
    expect(router.state.matches.at(-1)?.search).toEqual({});
  });
});

describe("AW02 Horario on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
  });

  it("shows one day at a time behind day tabs", async () => {
    server.use(sessionReads((params) => jsonResponse(weekOf(params))));
    const { user } = renderAdmin(`/?week=${nextMonday}`);
    await heading();

    const tabs = await screen.findByRole("tablist", {
      name: "Días de la semana",
    });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(7);
    expect(
      await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Mat Pilates, 16:00/ }),
    ).not.toBeInTheDocument();

    await user.click(within(tabs).getByRole("tab", { name: /Mié/ }));

    expect(
      screen.getByRole("button", { name: /Mat Pilates, 16:00/ }),
    ).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: /Mié/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

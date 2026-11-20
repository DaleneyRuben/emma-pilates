import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { formatDateTime } from "@pilates/api-contracts";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  weekStartOf,
} from "../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { expectClientInitials } from "../test/client-photo-fixtures";
import { classPanelName, openPanelTab } from "../test/class-panel";
import { renderAdmin } from "../test/render-admin";
import { roster, rosterPath } from "../test/roster-fixtures";
import {
  mondayReformer,
  nextMonday,
  saturdayEmpty,
  sessionFormHandlers,
  sessionsPath,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const lastMonday = addDays(weekStartOf(boliviaToday()), -7);
const pastReformer = {
  ...mondayReformer,
  id: "1e000000-0000-5000-8000-000000000098",
  startsAt: boliviaInstant(lastMonday, "07:00"),
  endsAt: boliviaInstant(lastMonday, "07:50"),
};

const openSession = async (name: RegExp, week = nextMonday) => {
  const view = renderAdmin(`/horario?week=${week}`);
  await view.user.click(await screen.findByRole("button", { name }));
  const panel = await screen.findByRole("dialog", { name: classPanelName });
  return { ...view, panel };
};

// FIX-091 W1 (Editar clase A): the class panel splits into Reservas, Editar
// and Serie semanal, titled by the class itself.
describe("W1 the class panel in tabs", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([mondayReformer, saturdayEmpty, pastReformer]),
      ),
      http.get(apiUrl(rosterPath(mondayReformer.id)), () =>
        jsonResponse(
          roster(mondayReformer.id, [
            "Ana Quiroga",
            "Lucía Fernández",
            "Sofía Rojas",
            "Isabel Vaca",
          ]),
        ),
      ),
    );
  });

  it("titles the panel by the class and opens on its bookings", async () => {
    const { panel } = await openSession(/Reformer Pilates, 07:00/);

    const when = formatDateTime(mondayReformer.startsAt);
    const title = `${when.charAt(0).toUpperCase()}${when.slice(1)} · Reformer Pilates`;
    expect(title).toMatch(classPanelName);
    expect(screen.getByRole("dialog", { name: title })).toBe(panel);
    expect(
      within(panel).getByText("4 de 10 lugares · Valeria Peña"),
    ).toBeInTheDocument();
    const tabs = within(panel).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Reservas · 4",
      "Editar",
      "Serie semanal",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    const bookings = within(panel).getByRole("tabpanel", {
      name: "Reservas · 4",
    });
    const booked = await within(bookings).findByRole("region", {
      name: "Reservaron (4)",
    });
    expectClientInitials(booked, "Ana Quiroga", "AQ");
    const book = within(bookings).getByRole("button", {
      name: "Reservar a una clienta",
    });
    expect(book).toHaveTextContent("Reservar a una clienta");
    expect(
      Boolean(
        booked.compareDocumentPosition(book) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(within(panel).queryByRole("button", { name: "Guardar" })).toBeNull();
  });

  it("edits only this class, and cancels it, from Editar", async () => {
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    const edit = await openPanelTab(user, panel, "Editar");

    expect(within(edit).getByLabelText("Instructora")).toBeInTheDocument();
    expect(within(edit).getByLabelText("Fecha")).toBeInTheDocument();
    expect(within(edit).getByLabelText("Capacidad")).toBeInTheDocument();
    expect(
      within(edit).getByRole("button", { name: "Guardar" }),
    ).toBeInTheDocument();
    expect(
      within(edit).getByRole("button", { name: "Cancelar esta clase" }),
    ).toBeInTheDocument();
    expect(
      within(edit).getByText(
        "Cambia solo esta clase. Para cambiar la serie, usa Serie semanal.",
      ),
    ).toBeInTheDocument();
    expect(within(panel).queryByLabelText("Esta y las futuras")).toBeNull();
    expect(
      within(panel).queryByRole("button", { name: "Pausar la serie" }),
    ).toBeNull();
  });

  it("changes, pauses and ends the series from Serie semanal", async () => {
    const { panel, user } = await openSession(/Reformer Pilates, 07:00/);
    const series = await openPanelTab(user, panel, "Serie semanal");

    expect(
      await within(series).findByLabelText("Día de la semana"),
    ).toHaveValue("1");
    expect(within(series).getByLabelText("Vigente desde")).toBeInTheDocument();
    expect(
      within(series).getByText(/Serie semanal · cada lunes 07:00/),
    ).toBeInTheDocument();
    expect(
      within(series).getByRole("button", { name: "Pausar la serie" }),
    ).toBeInTheDocument();
    expect(
      within(series).getByRole("button", { name: "Terminar la serie" }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Cancelar esta clase" }),
    ).toBeNull();
  });

  it("leaves Serie semanal out of a one-off class", async () => {
    const { panel, user } = await openSession(/Reformer Pilates, 09:00/);

    expect(
      within(panel)
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual(["Reservas · 0", "Editar"]);
    const edit = await openPanelTab(user, panel, "Editar");
    expect(
      within(edit).queryByText(/Para cambiar la serie/),
    ).not.toBeInTheDocument();
  });

  it("shows a past class's bookings alone, with no tabs", async () => {
    server.use(
      http.get(apiUrl(rosterPath(pastReformer.id)), () =>
        jsonResponse(roster(pastReformer.id, ["Ana Quiroga"])),
      ),
    );
    const { panel } = await openSession(
      /Reformer Pilates, 07:00/,
      weekStartOf(lastMonday),
    );

    expect(
      await within(panel).findByText("Clase pasada: solo lectura."),
    ).toBeInTheDocument();
    expect(
      await within(panel).findByRole("region", { name: "Reservaron (1)" }),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("tablist")).toBeNull();
  });
});

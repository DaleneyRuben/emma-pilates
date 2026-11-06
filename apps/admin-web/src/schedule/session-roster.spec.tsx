import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  addDays,
  boliviaInstant,
  boliviaToday,
  weekStartOf,
} from "../lib/bolivia-time";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { clientPage, clientRow, clientsPath } from "../test/people-fixtures";
import {
  bookingsPath,
  roster,
  rosterPath,
  waitlistPath,
} from "../test/roster-fixtures";
import {
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  wednesdayMat,
} from "../test/schedule-fixtures";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../test/session-handlers";
import { studioRulesHandler } from "../test/studio-settings-fixtures";

const mariana = clientRow("Mariana Peña");
const martina = clientRow("Martina Salvatierra", {
  planName: null,
  subscriptionStatus: "expired",
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const lastMonday = addDays(weekStartOf(boliviaToday()), -7);
const pastReformer = {
  ...mondayReformer,
  id: "1e000000-0000-5000-8000-000000000099",
  startsAt: boliviaInstant(lastMonday, "07:00"),
  endsAt: boliviaInstant(lastMonday, "07:50"),
};

const openSession = async (
  name: RegExp,
  week = nextMonday,
): Promise<ReturnType<typeof renderAdmin> & { panel: HTMLElement }> => {
  const view = renderAdmin(`/horario?week=${week}`);
  await view.user.click(await screen.findByRole("button", { name }));
  const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
  return { ...view, panel };
};

const searchFor = async (
  view: ReturnType<typeof renderAdmin>,
  button: string,
) => {
  await view.user.click(await screen.findByRole("button", { name: button }));
  const panel = await screen.findByRole("dialog", {
    name: "Reservar a una clienta",
  });
  await view.user.type(within(panel).getByLabelText("Buscar clienta"), "Ma");
  return panel;
};

describe("WEB-039 who booked a class and booking a Client from Horario", () => {
  useMockServer();
  let searched: string | null;
  beforeEach(() => {
    searched = null;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([mondayReformer, wednesdayMat, pastReformer]),
      ),
      http.get(apiUrl(rosterPath(mondayReformer.id)), () =>
        jsonResponse(
          roster(mondayReformer.id, ["Ana Quiroga", "Lucía Fernández"]),
        ),
      ),
      http.get(apiUrl(rosterPath(wednesdayMat.id)), () =>
        jsonResponse(
          roster(
            wednesdayMat.id,
            ["Ana Quiroga"],
            ["Sofía Guzmán", "Carla Méndez"],
          ),
        ),
      ),
      http.get(apiUrl(clientsPath), ({ request }) => {
        searched = new URL(request.url).searchParams.get("q");
        return jsonResponse(clientPage([mariana, martina]));
      }),
    );
  });

  it("shows who booked the class and who waits, in order", async () => {
    const { panel } = await openSession(/Mat Pilates, 16:00/);

    const booked = await within(panel).findByRole("region", {
      name: "Reservaron (1)",
    });
    expect(within(booked).getByText("Ana Quiroga")).toBeInTheDocument();
    const waiting = within(panel).getByRole("region", {
      name: "Lista de espera (2)",
    });
    expect(
      within(waiting)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/^1.*Sofía Guzmán/),
      expect.stringMatching(/^2.*Carla Méndez/),
    ]);
  });

  it("keeps the booking button when the roster cannot be read (FIX-042 review)", async () => {
    server.use(
      http.get(apiUrl(rosterPath(mondayReformer.id)), () =>
        problemResponse(500, "internal_error"),
      ),
    );
    const { panel } = await openSession(/Reformer Pilates, 07:00/);

    expect(
      await within(panel).findByText("No pudimos cargar quiénes reservaron."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Reservar a una clienta" }),
    ).toBeInTheDocument();
  });

  it("books a picked Client with a fresh idempotency key and says so", async () => {
    let request: { body: unknown; key: string | null } | null = null;
    server.use(
      http.post(apiUrl(bookingsPath(mondayReformer.id)), async (call) => {
        request = {
          body: await call.request.json(),
          key: call.request.headers.get("idempotency-key"),
        };
        return jsonResponse(
          { id: "b2000000-0000-5000-8000-000000000001" },
          201,
        );
      }),
    );
    const view = await openSession(/Reformer Pilates, 07:00/);
    expect(
      await within(view.panel).findByText("Lucía Fernández"),
    ).toBeInTheDocument();

    const panel = await searchFor(view, "Reservar a una clienta");
    await waitFor(() => expect(searched).toBe("Ma"));
    const noPlan = (await within(panel).findByText(martina.name)).closest("li");
    expect(noPlan).toHaveTextContent("Sin plan activo");
    expect(within(noPlan!).queryByRole("button")).toBeNull();

    await view.user.click(
      within(panel).getByRole("button", { name: `Elegir a ${mariana.name}` }),
    );
    await view.user.click(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    );

    await waitFor(() =>
      expect(request).toEqual({
        body: { clientId: mariana.id },
        key: expect.stringMatching(uuid) as string,
      }),
    );
    const detail = await screen.findByRole("dialog", { name: "Editar sesión" });
    expect(within(detail).getByRole("status")).toHaveTextContent(
      "Mariana Peña quedó reservada.",
    );
  });

  it("puts the Client on the waitlist when the class is full", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(waitlistPath(wednesdayMat.id)), async (call) => {
        body = await call.request.json();
        return jsonResponse(
          { id: "e2000000-0000-5000-8000-000000000001" },
          201,
        );
      }),
    );
    const view = await openSession(/Mat Pilates, 16:00/);
    const panel = await searchFor(view, "Agregar a la lista de espera");
    expect(panel).toHaveTextContent(
      "La clase está llena: la clienta entra a la lista de espera en el puesto 3.",
    );

    await view.user.click(
      await within(panel).findByRole("button", {
        name: `Elegir a ${mariana.name}`,
      }),
    );
    await view.user.click(
      within(panel).getByRole("button", { name: "Agregar a la lista" }),
    );

    await waitFor(() => expect(body).toEqual({ clientId: mariana.id }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mariana Peña quedó en la lista de espera.",
    );
  });

  it("shows the backend's refusal by its code and keeps the pick", async () => {
    server.use(
      http.post(apiUrl(bookingsPath(mondayReformer.id)), () =>
        problemResponse(409, "weekly_cap_reached"),
      ),
    );
    const view = await openSession(/Reformer Pilates, 07:00/);
    const panel = await searchFor(view, "Reservar a una clienta");
    await view.user.click(
      await within(panel).findByRole("button", {
        name: `Elegir a ${mariana.name}`,
      }),
    );
    await view.user.click(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    );

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Mariana Peña ya usó sus clases de esta semana.",
    );
    expect(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    ).toBeInTheDocument();
  });

  it("keeps a past class read-only, with no booking control", async () => {
    server.use(
      http.get(apiUrl(rosterPath(pastReformer.id)), () =>
        jsonResponse(roster(pastReformer.id, ["Ana Quiroga"])),
      ),
    );
    const { panel } = await openSession(/Reformer Pilates, 07:00/, lastMonday);

    expect(
      await within(panel).findByText("Clase pasada: solo lectura."),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Ana Quiroga")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Reservar a una clienta" }),
    ).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Guardar" })).toBeNull();
  });
});

describe("WEB-039 for the Coordinator", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...coordinatorHandlers(),
      ...sessionFormHandlers(),
      studioRulesHandler(),
    );
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse([mondayReformer])),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([mariana]))),
      http.post(apiUrl(bookingsPath(mondayReformer.id)), () =>
        jsonResponse({ id: "b2000000-0000-5000-8000-000000000002" }, 201),
      ),
    );
  });

  it("books a Client into a class too", async () => {
    const view = await openSession(/Reformer Pilates, 07:00/);
    expect(
      await within(view.panel).findByText("Nadie reservó todavía."),
    ).toBeInTheDocument();
    const panel = await searchFor(view, "Reservar a una clienta");
    await view.user.click(
      await within(panel).findByRole("button", {
        name: `Elegir a ${mariana.name}`,
      }),
    );
    await view.user.click(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mariana Peña quedó reservada.",
    );
  });
});

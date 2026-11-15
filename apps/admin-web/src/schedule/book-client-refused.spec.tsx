import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { clientPage, clientRow, clientsPath } from "../test/people-fixtures";
import { bookingsPath, roster, rosterPath } from "../test/roster-fixtures";
import {
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
} from "../test/schedule-fixtures";
import {
  currentSessionPath,
  paolaPrincipal,
  signedInHandlers,
} from "../test/session-handlers";

// FIX-058 (walkthrough finding 77): a refused booking used to send the
// Administrator home, hiding why. Only a session the backend no longer
// knows returns her to Login; any other refusal stays in the drawer.
const mariana = clientRow("Mariana Peña");

describe("FIX-058 a booking refused with 401 from Horario", () => {
  useMockServer();
  let signedIn: boolean;
  let bookingEndsSession: boolean;

  beforeEach(() => {
    signedIn = true;
    bookingEndsSession = false;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(currentSessionPath), () =>
        signedIn
          ? jsonResponse(paolaPrincipal)
          : problemResponse(401, "authentication_required"),
      ),
      http.get(apiUrl(sessionsPath), () => jsonResponse([mondayReformer])),
      http.get(apiUrl(rosterPath(mondayReformer.id)), () =>
        jsonResponse(roster(mondayReformer.id, ["Ana Quiroga"])),
      ),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([mariana]))),
      http.post(apiUrl(bookingsPath(mondayReformer.id)), () => {
        if (bookingEndsSession) signedIn = false;
        return problemResponse(401, "authentication_required");
      }),
    );
  });

  const confirmBooking = async () => {
    const view = renderAdmin(`/horario?week=${nextMonday}`);
    await view.user.click(
      await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
    );
    await view.user.click(
      await screen.findByRole("button", { name: "Reservar a una clienta" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Reservar a una clienta",
    });
    await view.user.type(within(panel).getByLabelText("Buscar clienta"), "Ma");
    await view.user.click(
      await within(panel).findByRole("button", {
        name: `Elegir a ${mariana.name}`,
      }),
    );
    await view.user.click(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    );
    return { ...view, panel };
  };

  it("shows the failure in the drawer while her session is still open", async () => {
    const { panel, router } = await confirmBooking();

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "No pudimos reservar. Inténtalo de nuevo.",
    );
    expect(router.state.location.pathname).toBe("/horario");
    expect(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    ).toBeInTheDocument();
  });

  it("returns to Login when the session really ended", async () => {
    bookingEndsSession = true;
    const { router } = await confirmBooking();

    expect(
      await screen.findByRole("heading", { name: "Inicia sesión" }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toEqual(
      expect.objectContaining({ notice: "session-ended" }),
    );
  });
});

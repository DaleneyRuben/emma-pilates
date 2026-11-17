import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { clientPage, clientRow, clientsPath } from "../test/people-fixtures";
import { bookingsPath, roster, rosterPath } from "../test/roster-fixtures";
import {
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

// Walkthrough finding 81 (FIX-056): after «Reservar a una clienta» the
// roster said «Reservaron (1)» while the panel header still read «0 de 8
// lugares reservados». The header counts what the roster now holds.
const mariana = clientRow("Mariana Peña");
const before = ["Ana Quiroga", "Lucía Fernández", "Sofía Rojas", "Isabel Vaca"];

describe("Editar sesión header after a booking", () => {
  useMockServer();
  let booked: boolean;

  beforeEach(() => {
    booked = false;
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      // The week keeps its earlier count, as a slow refresh would.
      http.get(apiUrl(sessionsPath), () => jsonResponse([mondayReformer])),
      http.get(apiUrl(rosterPath(mondayReformer.id)), () =>
        jsonResponse(
          roster(
            mondayReformer.id,
            booked ? [...before, mariana.name] : before,
          ),
        ),
      ),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([mariana]))),
      http.post(apiUrl(bookingsPath(mondayReformer.id)), () => {
        booked = true;
        return jsonResponse({}, 201);
      }),
    );
  });

  it("counts the new booking in the header at once", async () => {
    const { user } = renderAdmin(`/horario?week=${nextMonday}`);
    await user.click(
      await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Reservar a una clienta" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Reservar a una clienta",
    });
    await user.type(within(panel).getByLabelText("Buscar clienta"), "Ma");
    await user.click(
      await within(panel).findByRole("button", {
        name: `Elegir a ${mariana.name}`,
      }),
    );
    await user.click(
      within(panel).getByRole("button", { name: "Confirmar la reserva" }),
    );

    const detail = await screen.findByRole("dialog", { name: "Editar sesión" });
    expect(
      await within(detail).findByText("Mariana Peña quedó reservada."),
    ).toBeInTheDocument();
    expect(
      await within(detail).findByText(
        new RegExp(`· 5 de ${mondayReformer.capacity} lugares reservados`),
      ),
    ).toBeInTheDocument();
  });
});

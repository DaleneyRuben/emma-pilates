import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { page } from "../../test/booking-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  wednesdayMat,
  weekSessions,
} from "../../test/schedule-fixtures";
import {
  paolaPrincipal,
  signedInHandlers,
  signedOutHandlers,
} from "../../test/session-handlers";

// Holds a request until the spec lets it answer, so the busy state can be read.
const held = () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release() };
};

const busy = (button: HTMLElement) =>
  expect(button).toHaveAttribute("aria-busy", "true");

describe("busy submit buttons (WEB-023, follow-up 93)", () => {
  useMockServer();

  it("keeps «Iniciar sesión» busy until the sign-in answers and sends it once", async () => {
    server.use(...signedOutHandlers());
    const answer = held();
    let posts = 0;
    server.use(
      http.post(
        apiUrl("/api/v1/admin-web/authentication-sessions"),
        async () => {
          posts += 1;
          await answer.gate;
          return jsonResponse(paolaPrincipal, 201);
        },
      ),
    );
    const { user } = renderAdmin("/");
    await user.type(
      await screen.findByRole("textbox", { name: "Correo electrónico" }),
      "paola.mendoza@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "emma-local-2026");
    const signIn = screen.getByRole("button", { name: "Iniciar sesión" });

    await user.click(signIn);
    await waitFor(() => busy(signIn));
    expect(signIn).not.toBeDisabled();
    await user.click(signIn);
    expect(posts).toBe(1);

    server.use(...signedInHandlers());
    answer.release();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Iniciar sesión" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("spins only the Plan action that was clicked", async () => {
    const mensual = {
      id: "7a1b2c3d-0000-5000-8000-000000000003",
      name: "Mensual 16 clases",
      durationDays: 30,
      weeklyClassCap: null,
      durationMonths: 1,
      classAllowance: 16,
      priceCentavos: 105_000,
      displayOrder: 3,
      hiddenAt: null,
    };
    const answer = held();
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl("/api/v1/administrator/plans"), () =>
        jsonResponse(page([mensual])),
      ),
      http.put(
        apiUrl(`/api/v1/administrator/plans/${mensual.id}/visibility`),
        async () => {
          await answer.gate;
          return jsonResponse(mensual);
        },
      ),
    );
    const { user } = renderAdmin("/catalogo/planes");
    await user.click(
      await screen.findByRole("button", { name: "Mensual 16 clases" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar plan" });
    const hide = within(panel).getByRole("button", {
      name: "Ocultar en la app",
    });

    await user.click(hide);
    await waitFor(() => busy(hide));
    const save = within(panel).getByRole("button", { name: "Guardar" });
    expect(save).not.toHaveAttribute("aria-busy");
    expect(save).toBeDisabled();
    answer.release();
  });

  it("keeps the confirming button of a dialog busy while it works", async () => {
    const answer = held();
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
      http.post(
        apiUrl(`${sessionsPath}/${wednesdayMat.id}/cancel`),
        async () => {
          await answer.gate;
          return jsonResponse({ affectedBookings: 10 });
        },
      ),
    );
    const { user } = renderAdmin(`/?week=${nextMonday}`);
    await user.click(
      await screen.findByRole("button", { name: /Mat Pilates, 16:00/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
    await user.click(
      within(panel).getByRole("button", { name: "Cancelar sesión" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Cancelar esta sesión?",
    });
    const yes = within(confirm).getByRole("button", {
      name: "Cancelar sesión",
    });

    await user.click(yes);
    await waitFor(() => busy(yes));
    expect(
      within(confirm).getByRole("button", { name: "Volver" }),
    ).not.toHaveAttribute("aria-busy");
    answer.release();
  });
});

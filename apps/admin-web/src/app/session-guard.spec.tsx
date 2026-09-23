import { screen } from "@testing-library/react";
import { ApiError } from "../api/problem";
import { http, HttpResponse } from "msw";
import { apiUrl, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  currentSessionPath,
  signedInHandlers,
  signedOutHandlers,
} from "../test/session-handlers";

const heading = (name: string) =>
  screen.findByRole("heading", { level: 1, name });

describe("admin session guard", () => {
  useMockServer();

  it("sends a signed-out visitor to Login and remembers the page they wanted", async () => {
    server.use(...signedOutHandlers());
    const { router } = renderAdmin("/catalogo/planes?page=2");

    expect(await heading("Iniciar sesión")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/iniciar-sesion");
    expect(router.state.location.search).toEqual({
      redirect: "/catalogo/planes?page=2&pageSize=20",
    });
    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();
  });

  it("restores a signed-in browser session at startup without asking again", async () => {
    server.use(...signedInHandlers());
    renderAdmin("/catalogo/planes");

    expect(await heading("Planes")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Secciones" }),
    ).toBeInTheDocument();
  });

  it("sends a signed-in Administrator away from Login to the schedule", async () => {
    server.use(...signedInHandlers());
    const { router } = renderAdmin("/iniciar-sesion");

    expect(await heading("Horario")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("returns to Login once, with a notice, when a later request finds the session ended", async () => {
    server.use(...signedInHandlers());
    const { router, queryClient } = renderAdmin("/back-office/gastos");
    await heading("Gastos");
    server.use(...signedOutHandlers());

    const ended = () =>
      Promise.reject(
        new ApiError({ status: 401, code: "authentication_required" }),
      );
    await Promise.allSettled([
      queryClient.fetchQuery({ queryKey: ["uno"], queryFn: ended }),
      queryClient.fetchQuery({ queryKey: ["dos"], queryFn: ended }),
    ]);

    expect(await heading("Iniciar sesión")).toBeInTheDocument();
    expect(
      screen.getByText("Tu sesión terminó. Vuelve a iniciar sesión."),
    ).toBeInTheDocument();
    expect(router.state.location.search).toEqual({
      redirect: "/back-office/gastos?page=1&pageSize=20",
      notice: "session-ended",
    });
    expect(router.history.length).toBe(2);
    expect(queryClient.getQueryData(["uno"])).toBeUndefined();
  });

  it("offers a retry instead of Login when the backend cannot be reached at startup", async () => {
    server.use(
      http.get(apiUrl(currentSessionPath), () => HttpResponse.error()),
    );
    renderAdmin("/");
    expect(
      await screen.findByText(
        "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});

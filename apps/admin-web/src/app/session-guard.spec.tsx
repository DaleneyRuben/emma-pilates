import { act, screen, within } from "@testing-library/react";
import { ApiError } from "../api/problem";
import { http, HttpResponse } from "msw";
import { apiUrl, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
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
    const { router } = renderAdmin(
      "/back-office/evaluaciones-nutricionales?page=2",
    );

    expect(await heading("Iniciar sesión")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/iniciar-sesion");
    expect(router.state.location.search).toEqual({
      redirect: "/back-office/evaluaciones-nutricionales?page=2&pageSize=20",
    });
    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();
  });

  it("restores a signed-in browser session at startup without asking again", async () => {
    server.use(...signedInHandlers(), ...emptyPageHandlers());
    renderAdmin("/back-office/evaluaciones-nutricionales");

    expect(await heading("Evaluaciones nutricionales")).toBeInTheDocument();
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
    server.use(...signedInHandlers(), ...emptyPageHandlers());
    const { router, queryClient } = renderAdmin("/back-office/gastos");
    await heading("Gastos");
    server.use(...signedOutHandlers());

    const ended = () =>
      Promise.reject(
        new ApiError({ status: 401, code: "authentication_required" }),
      );
    // The expiry navigates as the rejections land, outside any Testing
    // Library call, so the test holds the act scope itself.
    await act(async () => {
      await Promise.allSettled([
        queryClient.fetchQuery({ queryKey: ["uno"], queryFn: ended }),
        queryClient.fetchQuery({ queryKey: ["dos"], queryFn: ended }),
      ]);
    });

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

  it("reports an expiry again after a session restored without Login (another tab signed in)", async () => {
    server.use(
      ...signedInHandlers(),
      ...emptyPageHandlers(),
      http.delete(apiUrl(currentSessionPath), () => {
        server.use(...signedOutHandlers());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router, queryClient, user } = renderAdmin("/back-office/gastos");
    await heading("Gastos");

    await user.click(await screen.findByRole("button", { name: /Tu cuenta/ }));
    const menu = await screen.findByRole("dialog", { name: "Tu cuenta" });
    await user.click(
      within(menu).getByRole("button", { name: "Cerrar sesión" }),
    );
    await user.click(
      within(menu).getByRole("button", { name: "Cerrar sesión" }),
    );
    await heading("Iniciar sesión");

    // Another tab signed in; this tab goes back and the probe finds a session.
    server.use(...signedInHandlers(), ...emptyPageHandlers());
    await act(() =>
      router.navigate({
        to: "/back-office/gastos",
        search: { page: 1, pageSize: 20 },
      }),
    );
    await heading("Gastos");

    server.use(...signedOutHandlers());
    await act(async () => {
      await queryClient
        .fetchQuery({
          queryKey: ["tarde"],
          queryFn: () =>
            Promise.reject(
              new ApiError({ status: 401, code: "authentication_required" }),
            ),
        })
        .catch(() => undefined);
    });

    expect(await heading("Iniciar sesión")).toBeInTheDocument();
    expect(
      screen.getByText("Tu sesión terminó. Vuelve a iniciar sesión."),
    ).toBeInTheDocument();
  });

  it("offers a retry instead of Login when the backend cannot be reached at startup", async () => {
    server.use(
      http.get(apiUrl(currentSessionPath), () => HttpResponse.error()),
    );
    // React reports the error the route boundary catches through
    // console.error; the test expects it instead of letting it print.
    const reported = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    renderAdmin("/");
    expect(
      await screen.findByText(
        "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
    expect(reported.mock.calls.flat()).toContainEqual(
      expect.objectContaining({ status: 0, code: "network_error" }),
    );
    reported.mockRestore();
  });
});

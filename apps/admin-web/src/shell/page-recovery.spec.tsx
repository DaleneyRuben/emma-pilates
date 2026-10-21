import { QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoot } from "react-dom/client";
import { createAdminQueryClient } from "../api/query-client";
import { server, useMockServer } from "../test/msw";
import { signedInHandlers } from "../test/session-handlers";
import { AdminShell } from "./admin-shell";

// A page that throws while drawing until it is told to stop: the defect a
// boundary must catch (WEB-032), in a shell of its own so no real page has
// to be broken for the test.
const pageState = { failing: true };

function FailingPage() {
  if (pageState.failing) {
    throw new Error("the page could not draw");
  }
  return <h1>Horario</h1>;
}

function OtherPage() {
  return <h1>Planes</h1>;
}

const buildRouter = (path: string) => {
  const rootRoute = createRootRoute({ component: AdminShell });
  const failingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: FailingPage,
  });
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/catalogo/planes",
    component: OtherPage,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([failingRoute, otherRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
};

const renderShellWith = (path = "/") => {
  const queryClient = createAdminQueryClient();
  const router = buildRouter(path);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, user: userEvent.setup() };
};

describe("a page that fails while drawing (WEB-032, follow-up 105)", () => {
  useMockServer();
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    pageState.failing = true;
    server.use(...signedInHandlers());
    // React logs every caught render error; the test is about the recovery.
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it("keeps the shell and shows the recovery state in the content area", async () => {
    renderShellWith();

    const main = await screen.findByRole("main");
    const alert = await within(main).findByRole("alert");
    expect(
      within(alert).getByRole("heading", { level: 1, name: "Algo salió mal" }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      "No pudimos mostrar esta página. Inténtalo de nuevo; si vuelve a pasar, recarga la página.",
    );
    expect(
      within(alert).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Secciones" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No pudimos conectar con el servidor", {
        exact: false,
      }),
    ).not.toBeInTheDocument();
  });

  it("draws the page again from scratch on Reintentar", async () => {
    const { user } = renderShellWith();
    const retry = await screen.findByRole("button", { name: "Reintentar" });

    pageState.failing = false;
    await user.click(retry);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("leaves the state behind when the sidebar moves to another page", async () => {
    const { user } = renderShellWith();
    await screen.findByRole("button", { name: "Reintentar" });

    await user.click(screen.getByRole("link", { name: "Planes" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Planes" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // EXT-011: the root's caught-error handler is what reaches error
  // monitoring, so a boundary that swallowed the error would hide it.
  it("hands the error to the root's caught-error handler, so monitoring sees it", async () => {
    const onCaughtError = jest.fn();
    const container = document.body.appendChild(document.createElement("div"));
    const root = createRoot(container, { onCaughtError });
    const router = buildRouter("/");

    await act(async () => {
      root.render(
        <QueryClientProvider client={createAdminQueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      );
    });
    await within(container).findByRole("button", { name: "Reintentar" });

    expect(onCaughtError).toHaveBeenCalledTimes(1);
    expect(onCaughtError.mock.calls[0]?.[0]).toEqual(
      new Error("the page could not draw"),
    );
    await act(async () => root.unmount());
    container.remove();
  });
});

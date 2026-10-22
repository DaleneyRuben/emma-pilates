import { QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { createAdminQueryClient } from "../api/query-client";
import { pagePendingOptions } from "../app/page-pending";
import { server, useMockServer } from "../test/msw";
import { signedInHandlers } from "../test/session-handlers";
import { AdminShell } from "./admin-shell";

// WEB-035, design follow-up 107: every page is its own chunk, and a sidebar
// click can land before the chunk has arrived (a fast click beats the
// hover preload, or the connection is slow). The shell then shows only the
// logo in its content area, after 400 ms so a page that arrives in time
// never flashes it, and for at least 500 ms once shown so the logo itself
// never flashes.
type PageModule = { PlansPage: ComponentType };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function SchedulePage() {
  return <h1>Horario</h1>;
}

function PlansPage() {
  return <h1>Planes</h1>;
}

const buildRouter = (chunk: Promise<PageModule>) => {
  const rootRoute = createRootRoute({ component: AdminShell });
  const scheduleRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: SchedulePage,
  });
  const plansRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/catalogo/planes",
    component: lazyRouteComponent(() => chunk, "PlansPage"),
  });
  return createRouter({
    routeTree: rootRoute.addChildren([scheduleRoute, plansRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    ...pagePendingOptions,
  });
};

const advance = (milliseconds: number) =>
  act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });

describe("a page slow to arrive (WEB-035, follow-up 107)", () => {
  useMockServer();
  let chunk: ReturnType<typeof deferred<PageModule>>;

  beforeEach(() => {
    server.use(...signedInHandlers());
    chunk = deferred<PageModule>();
  });
  afterEach(() => jest.useRealTimers());

  const renderShellOnHorario = async () => {
    const router = buildRouter(chunk.promise);
    render(
      <QueryClientProvider client={createAdminQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await screen.findByRole("heading", { level: 1, name: "Horario" });
    // The first page needs the mock server's real I/O; the switch is pure
    // timers, so the clock is faked only from here.
    jest.useFakeTimers();
    // The navigation settles only when the chunk arrives, so it is not
    // awaited; the act scope flushes what it renders at once.
    await act(async () => {
      void router.navigate({ to: "/catalogo/planes" });
    });
    return router;
  };

  it("shows only the logo in the content area after 400 ms, keeping the shell", async () => {
    await renderShellOnHorario();

    await advance(399);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Horario" }),
    ).toBeInTheDocument();

    await advance(1);
    const main = screen.getByRole("main");
    const status = within(main).getByRole("status", {
      name: "Cargando la página",
    });
    expect(status.querySelector("img.carga-logo")).toHaveAttribute("alt", "");
    expect(status).toHaveTextContent("");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Secciones" }),
    ).toBeInTheDocument();
  });

  it("never shows it for a page that arrives in time", async () => {
    await renderShellOnHorario();

    await advance(100);
    await act(async () => chunk.resolve({ PlansPage }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Planes" }),
    ).toBeInTheDocument();

    await advance(1_000);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps it for at least 500 ms once shown, then draws the page", async () => {
    await renderShellOnHorario();
    await advance(400);
    screen.getByRole("status", { name: "Cargando la página" });

    await advance(50);
    await act(async () => chunk.resolve({ PlansPage }));
    await advance(400);
    expect(
      screen.getByRole("status", { name: "Cargando la página" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Planes" }),
    ).not.toBeInTheDocument();

    await advance(100);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Planes" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

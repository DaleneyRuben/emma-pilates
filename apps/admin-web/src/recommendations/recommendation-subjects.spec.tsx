import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { RecommendationsSection } from "./recommendations-page";

const listPath = "/api/v1/administrator/recommendations";

const inactive = {
  id: "22222222-2222-4222-8222-222222222222",
  rule: "inactive_client",
  subject: "client-luz",
  period: "2026-11-01",
  detail: "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
  state: "new",
  clientId: "client-luz",
  clientName: "Luz Pérez",
};

const weak = {
  id: "11111111-1111-4111-8111-111111111111",
  rule: "weak_schedule",
  subject: "trainer-daniela:2",
  period: "2026-11-01",
  detail: "Revisa el horario del martes: promedia 0,2 alumnas en 15 clases.",
  state: "new",
  trainerName: "Daniela Rojas",
  weekday: 2,
};

const list = (recommendations: unknown[]) =>
  http.get(apiUrl(listPath), () =>
    jsonResponse({ month: "2026-11", recommendations }),
  );

// The section links to Clientes, so it renders inside a router.
const renderSection = (readOnly = false) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <RecommendationsSection month="2026-11" readOnly={readOnly} />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/informes"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
};

// Walkthrough finding 107: a finding says who it is about, and the month can
// be recalculated from the page.
describe("AW44 Recomendaciones names who each one is about", () => {
  useMockServer();

  it("links an inactive client's name to her file in Clientes", async () => {
    server.use(list([inactive]));
    renderSection();

    const link = await screen.findByRole("link", { name: "Luz Pérez" });
    const href = new URL(link.getAttribute("href") ?? "", "http://x");
    expect(href.pathname).toBe("/clientas");
    expect(href.searchParams.get("cliente")).toBe("client-luz");
    expect(href.searchParams.get("q")).toBe("Luz Pérez");
    expect(screen.getByText(inactive.detail)).toBeVisible();
  });

  it("names the trainer and the weekday of a weak schedule", async () => {
    server.use(list([weak]));
    renderSection();

    expect(await screen.findByText("Daniela Rojas · martes")).toBeVisible();
  });

  it("recalculates the month and shows what it found", async () => {
    const posted: unknown[] = [];
    server.use(
      list([]),
      http.post(apiUrl(`${listPath}/recompute`), async ({ request }) => {
        posted.push(await request.json());
        server.use(list([inactive]));
        return jsonResponse({ month: "2026-11", written: 1 });
      }),
    );
    const { user } = renderSection();

    expect(await screen.findByText("Nada que revisar este mes.")).toBeVisible();
    const region = screen.getByRole("region", {
      name: "Recomendaciones del mes",
    });
    await user.click(
      within(region).getByRole("button", { name: "Recalcular" }),
    );

    expect(
      await screen.findByRole("link", { name: "Luz Pérez" }),
    ).toBeVisible();
    expect(posted).toEqual([{ month: "2026-11" }]);
  });

  it("says when the recalculation fails", async () => {
    server.use(
      list([]),
      http.post(apiUrl(`${listPath}/recompute`), () =>
        jsonResponse({ code: "x" }, 500),
      ),
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole("button", { name: "Recalcular" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos recalcular las recomendaciones.",
    );
  });

  it("hides Recalcular when the page is read only", async () => {
    server.use(list([inactive]));
    renderSection(true);

    expect(
      await screen.findByRole("link", { name: "Luz Pérez" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Recalcular" })).toBeNull();
  });
});

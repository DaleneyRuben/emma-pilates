import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import userEvent from "@testing-library/user-event";
import { RecommendationsSection } from "./recommendations-page";

const listPath = "/api/v1/administrator/recommendations";

const finding = {
  id: "11111111-1111-4111-8111-111111111111",
  rule: "weak_schedule",
  subject: "trainer:2",
  period: "2026-10-01",
  detail: "Revisa el horario del martes: promedia 1,7 alumnas.",
  state: "new",
};

const inactive = {
  id: "22222222-2222-4222-8222-222222222222",
  rule: "inactive_client",
  subject: "client-luz",
  period: "2026-10-01",
  detail: "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
  state: "new",
};

const list = (recommendations: unknown[]) =>
  http.get(apiUrl(listPath), () =>
    jsonResponse({ month: "2026-10", recommendations }),
  );

// AW44 as Informes › El mes draws it, for the month the page shows.
const renderSection = (readOnly = false) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecommendationsSection month="2026-10" readOnly={readOnly} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
};

describe("AW44 Recomendaciones del mes", () => {
  useMockServer();

  it("lists the month's findings and discards one", async () => {
    server.use(list([finding, inactive]));
    const { user } = renderSection();

    expect(
      screen.getByRole("region", { name: "Recomendaciones del mes" }),
    ).toBeVisible();
    expect(await screen.findByText(finding.detail)).toBeVisible();
    expect(screen.getByText(inactive.detail)).toBeVisible();
    expect(screen.getAllByText("Nueva")).toHaveLength(2);
    const row = screen.getByText(finding.detail).closest("li");
    expect(row).not.toBeNull();
    server.use(
      http.post(apiUrl(`${listPath}/${finding.id}/dismiss`), () =>
        jsonResponse({ ...finding, state: "dismissed" }),
      ),
      list([{ ...finding, state: "dismissed" }, inactive]),
    );
    await user.click(
      within(row as HTMLElement).getByRole("button", { name: "Descartar" }),
    );

    expect(await screen.findByText("Descartada")).toBeVisible();
  });

  it("hides Descartar when the page is read only", async () => {
    server.use(list([finding]));
    renderSection(true);

    expect(await screen.findByText(finding.detail)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
  });

  it("says the month has nothing to review", async () => {
    server.use(list([]));
    renderSection();

    expect(await screen.findByText("Nada que revisar este mes.")).toBeVisible();
  });

  it("shows the error state", async () => {
    server.use(
      http.get(apiUrl(listPath), () =>
        problemResponse(500, "no_se_pudo", { detail: "No se pudo" }),
      ),
    );
    renderSection();

    expect(
      await screen.findByText("No pudimos cargar las recomendaciones."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  it("shows the loading notice before the list arrives", async () => {
    server.use(http.get(apiUrl(listPath), () => new Promise(() => undefined)));
    renderSection();

    expect(
      await screen.findByText("Cargando las recomendaciones…"),
    ).toBeVisible();
  });
});

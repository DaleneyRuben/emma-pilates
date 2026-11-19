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
import { findBrandedLoading } from "../test/branded-loading";

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

  // FIX-091 (W6 B): grouped by type with chips; the settled ones apart.
  it("groups the month's findings by type and discards one", async () => {
    server.use(list([finding, inactive]));
    const { user } = renderSection();

    expect(
      screen.getByRole("region", { name: "Recomendaciones del mes" }),
    ).toBeVisible();
    expect(await screen.findByText(finding.detail)).toBeVisible();
    const kinds = screen.getByRole("group", { name: "Tipo de recomendación" });
    expect(
      within(kinds).getByRole("button", { name: "Horario · 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(inactive.detail)).toBeNull();
    expect(screen.getByText("Nueva")).toBeVisible();

    await user.click(
      within(kinds).getByRole("button", { name: "Clientas · 1" }),
    );
    expect(screen.getByText(inactive.detail)).toBeVisible();
    expect(screen.queryByText(finding.detail)).toBeNull();

    await user.click(
      within(kinds).getByRole("button", { name: "Horario · 1" }),
    );
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

    expect(
      await within(kinds).findByRole("button", { name: "Horario · 0" }),
    ).toBeVisible();
    expect(screen.queryByText(finding.detail)).toBeNull();
    expect(screen.getByText("Nada pendiente en este grupo.")).toBeVisible();
    await user.click(within(kinds).getByRole("button", { name: "Resueltas" }));
    expect(screen.getByText(finding.detail)).toBeVisible();
    expect(screen.getByText("Descartada")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
  });

  it("opens another month on its own first type, not the last chip chosen", async () => {
    server.use(
      http.get(apiUrl(listPath), ({ request }) => {
        const month = new URL(request.url).searchParams.get("month");
        return jsonResponse({
          month,
          recommendations:
            month === "2026-10" ? [finding, inactive] : [finding],
        });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const section = (month: string) => (
      <QueryClientProvider client={queryClient}>
        <RecommendationsSection month={month} readOnly={false} />
      </QueryClientProvider>
    );
    // November is already cached when the page comes back to it.
    const { rerender } = render(section("2026-11"));
    await screen.findByText(finding.detail);
    rerender(section("2026-10"));
    const user = userEvent.setup();
    await screen.findByText(finding.detail);
    await screen.findByRole("button", { name: "Clientas · 1" });
    const kinds = () =>
      screen.getByRole("group", { name: "Tipo de recomendación" });
    await user.click(
      within(kinds()).getByRole("button", { name: "Clientas · 1" }),
    );

    rerender(section("2026-11"));

    const next = await screen.findByRole("group", {
      name: "Tipo de recomendación",
    });
    expect(
      within(next).getByRole("button", { name: "Horario · 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText(finding.detail)).toBeVisible();
  });

  // A resolved finding that holds again comes back as new unless it was
  // discarded, so Resueltas keeps Descartar for it.
  it("still discards a resolved finding", async () => {
    server.use(list([{ ...finding, state: "resolved" }]));
    renderSection();

    expect(await screen.findByText(finding.detail)).toBeVisible();
    const kinds = screen.getByRole("group", { name: "Tipo de recomendación" });
    expect(
      within(kinds).getByRole("button", { name: "Resueltas" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Resuelta")).toBeVisible();
    expect(screen.getByRole("button", { name: "Descartar" })).toBeEnabled();
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

    await findBrandedLoading("Cargando las recomendaciones…");
  });
});

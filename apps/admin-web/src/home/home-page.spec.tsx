import { screen, waitFor, within } from "@testing-library/react";
import type { RecommendationDto } from "@pilates/api-contracts";
import { http } from "msw";
import { suppliesPath } from "../test/back-office-fixtures";
import { equipetrol } from "../test/booking-handlers";
import { contactAlertsCount } from "../test/home-fixtures";
import {
  emptyIncome,
  freezesPath,
  payStatementsPath,
  recommendationsPath,
} from "../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { pendingBadgeHandler } from "../test/payment-fixtures";
import { incomeReportPath } from "../test/report-fixtures";
import { findBrandedLoading } from "../test/branded-loading";
import { renderAdmin } from "../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../test/session-handlers";

const freeze = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
};

const draftStatement = {
  id: "statement-1",
  staffMemberId: "emma",
  staffMemberName: "Emma Vargas",
  month: "2026-11-01",
  periodStart: "2026-11-01",
  periodEnd: "2026-12-01",
  approvableOn: "2026-12-01",
  state: "draft",
  totalCentavos: 6_500,
  salaryPaymentId: null,
  lines: [],
};

const weakSchedule = (
  id: string,
  trainerName: string,
  weekday: number,
  state: RecommendationDto["state"] = "new",
): RecommendationDto => ({
  id,
  rule: "weak_schedule",
  subject: `${trainerName}:${weekday}`,
  period: "2026-11",
  detail: "Revisa el horario: promedia 1 alumna en 4 clases.",
  state,
  trainerName,
  weekday,
});

const inactiveClient = (
  id: string,
  clientName: string,
  state: RecommendationDto["state"] = "new",
): RecommendationDto => ({
  id,
  rule: "inactive_client",
  subject: id,
  period: "2026-11",
  detail: "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
  state,
  clientId: id,
  clientName,
});

// P01, P01b, P01c (WEB-043): the three summaries, the pending list with the
// tab that settles each row, and the month's recommendations.
describe("Inicio for the Administrator", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("lists what waits in one list, the pay to approve first with the one solid button", async () => {
    server.use(
      pendingBadgeHandler(2),
      contactAlertsCount(1),
      http.get(apiUrl(freezesPath), () => jsonResponse([freeze])),
      http.get(apiUrl(payStatementsPath), () => jsonResponse([draftStatement])),
    );
    renderAdmin("/");

    const pending = await screen.findByRole("region", { name: "Por resolver" });
    // FIX-084 (Inicio A): no «N pendientes» block, only the list.
    expect(screen.queryByText(/pendientes$/)).toBeNull();
    const links = await within(pending).findAllByRole("link");
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Revisar", "/dinero/sueldos"],
      ["Revisar", "/dinero/pagos"],
      ["Revisar", "/clientas/congelamientos"],
      ["Revisar", "/clientas/para-contactar"],
    ]);
    expect(links[0]).toHaveAttribute("data-emphasis", "primary");
    expect(
      links.slice(1).map((link) => link.getAttribute("data-emphasis")),
    ).toEqual(["outline", "outline", "outline"]);
    expect(within(pending).getByText("1 sueldo por aprobar")).toBeVisible();
    expect(within(pending).getByText("2 pagos por revisar")).toBeVisible();
    expect(
      within(pending).getByText("1 congelamiento por decidir"),
    ).toBeVisible();
  });

  it("says everything is up to date when nothing waits", async () => {
    renderAdmin("/");

    const pending = await screen.findByRole("region", { name: "Por resolver" });
    expect(
      within(pending).getByText("Todo al día: nada espera tu respuesta."),
    ).toBeVisible();
    expect(within(pending).queryByRole("link")).toBeNull();
  });

  it("shows the branded loading state, not «Todo al día», until it knows what waits (WEB-045)", async () => {
    server.use(
      http.get(apiUrl(freezesPath), () => new Promise(() => undefined)),
    );
    renderAdmin("/");

    await findBrandedLoading("Cargando el inicio…");
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Por resolver" })).toBeNull();
    expect(screen.queryByText("Nada por resolver.")).toBeNull();
    expect(screen.queryAllByRole("status")).toHaveLength(1);
  });

  it("keeps its cards while another Branch's counts load (WEB-045)", async () => {
    server.use(
      http.get(apiUrl(suppliesPath), ({ request }) =>
        new URL(request.url).searchParams.get("branchId") === equipetrol.id
          ? new Promise(() => undefined)
          : undefined,
      ),
    );
    const { user } = renderAdmin("/");
    await screen.findByRole("region", { name: "Por resolver" });

    await user.click(
      await screen.findByRole("button", { name: "Sucursal Centro" }),
    );
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );

    await screen.findByText(/Sucursal Equipetrol$/);
    expect(screen.getByRole("region", { name: "Por resolver" })).toBeVisible();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows what was collected today for the whole studio", async () => {
    const ranges: string[] = [];
    server.use(
      pendingBadgeHandler(2),
      http.get(apiUrl(incomeReportPath), ({ request }) => {
        const url = new URL(request.url);
        ranges.push(`${url.searchParams.get("from")}`);
        return jsonResponse(emptyIncome(50_200, 30_000));
      }),
    );
    renderAdmin("/");

    const money = await screen.findByRole("region", { name: "Cobrado hoy" });
    expect(await within(money).findByText("Bs 802")).toBeVisible();
    expect(
      within(money).getByText(
        "Efectivo Bs 502 · QR Bs 300 · 2 QR por revisar, aún no cuentan",
      ),
    ).toBeVisible();
    expect(
      within(money).getByRole("link", { name: "Ver pagos" }),
    ).toHaveAttribute("href", "/dinero/pagos");
    expect(new Set(ranges).size).toBe(1);
  });

  it("summarizes today's classes at the selected Branch in one line", async () => {
    renderAdmin("/");

    const today = await screen.findByRole("region", { name: "Hoy" });
    expect(
      within(today).getByText("0 clases · 0 reservas · — ocupación"),
    ).toBeVisible();
    expect(within(today).getByText("Sin clases hoy.")).toBeVisible();
    expect(
      within(today).getByRole("link", { name: "Ver horario" }),
    ).toHaveAttribute("href", "/horario");
  });

  it("groups the month's recommendations, hides settled ones, and shows at most three", async () => {
    server.use(
      http.get(apiUrl(recommendationsPath), () =>
        jsonResponse({
          month: "2026-11",
          recommendations: [
            ...[1, 2, 3, 4, 5, 6].map((weekday) =>
              weakSchedule(`w${weekday}`, "Daniela Ortiz", weekday),
            ),
            weakSchedule("v1", "Valeria Peña", 2),
            weakSchedule("v2", "Valeria Peña", 3, "resolved"),
            weakSchedule("e1", "Emma Vargas", 4),
            weakSchedule("g1", "Gabriela Ríos", 5),
            inactiveClient("c1", "Carla Prueba"),
            inactiveClient("c2", "Rocío Vargas", "dismissed"),
          ],
        }),
      ),
    );
    renderAdmin("/");

    const section = await screen.findByRole("region", {
      name: "Recomendaciones",
    });
    const rows = await within(section).findAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual([
      "Revisa el horario de Daniela Ortiz",
      "Revisa el horario de Valeria Peña",
      "Revisa el horario de Emma Vargas",
    ]);
    expect(
      within(rows[0]!).getByText(
        "6 días de la semana: lunes, martes, miércoles, jueves, viernes y sábado",
      ),
    ).toBeVisible();
    expect(
      within(section).getByRole("link", { name: "Ver las 10" }),
    ).toHaveAttribute("href", "/informes");
    expect(screen.queryByText("Recalcular")).toBeNull();
  });

  it("discards every finding of a grouped row at once", async () => {
    const dismissed: string[] = [];
    server.use(
      http.get(apiUrl(recommendationsPath), () =>
        jsonResponse({
          month: "2026-11",
          recommendations: [
            weakSchedule("w1", "Daniela Ortiz", 1),
            weakSchedule("w2", "Daniela Ortiz", 2),
          ],
        }),
      ),
      http.post(apiUrl(`${recommendationsPath}/:id/dismiss`), ({ params }) => {
        dismissed.push(String(params.id));
        return jsonResponse(
          weakSchedule(String(params.id), "Daniela Ortiz", 1, "dismissed"),
        );
      }),
    );
    const { user } = renderAdmin("/");

    const section = await screen.findByRole("region", {
      name: "Recomendaciones",
    });
    await user.click(
      await within(section).findByRole("button", {
        name: "Descartar: Revisa el horario de Daniela Ortiz",
      }),
    );
    await waitFor(() => expect(dismissed.sort()).toEqual(["w1", "w2"]));
  });

  it("says how many of a grouped row it could not discard", async () => {
    server.use(
      http.get(apiUrl(recommendationsPath), () =>
        jsonResponse({
          month: "2026-11",
          recommendations: [
            weakSchedule("w1", "Daniela Ortiz", 1),
            weakSchedule("w2", "Daniela Ortiz", 2),
          ],
        }),
      ),
      http.post(apiUrl(`${recommendationsPath}/:id/dismiss`), ({ params }) =>
        params.id === "w2"
          ? new Response(null, { status: 500 })
          : jsonResponse(weakSchedule("w1", "Daniela Ortiz", 1, "dismissed")),
      ),
    );
    const { user } = renderAdmin("/");

    await user.click(
      await screen.findByRole("button", {
        name: "Descartar: Revisa el horario de Daniela Ortiz",
      }),
    );
    expect(
      await screen.findByText(
        "No pudimos descartar 1 de las 2 recomendaciones.",
      ),
    ).toBeVisible();
  });
});

describe("Inicio for the Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  it("shows Clientas instead of Dinero and only the rows she settles", async () => {
    server.use(contactAlertsCount(3));
    renderAdmin("/");

    const pending = await screen.findByRole("region", { name: "Por resolver" });
    expect(
      await within(pending).findByText("3 clientas para contactar"),
    ).toBeVisible();
    expect(
      await screen.findByRole("region", { name: "Clientas" }),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "Cobrado hoy" })).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(
      within(pending)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/clientas/para-contactar"]);
    expect(screen.queryByRole("button", { name: /^Descartar/ })).toBeNull();
  });
});

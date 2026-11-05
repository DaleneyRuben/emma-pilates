import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { suppliesPath } from "../test/back-office-fixtures";
import { equipetrol } from "../test/booking-handlers";
import { contactAlertsCount } from "../test/home-fixtures";
import { emptyIncome, freezesPath } from "../test/home-handlers";
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

// P01, P01b, P01c (WEB-043): the three summaries, the pending list with the
// tab that settles each row, and the month's recommendations.
describe("Inicio for the Administrator", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("sums what waits on the Rosa profundo card and lists each row with its tab", async () => {
    server.use(
      pendingBadgeHandler(2),
      contactAlertsCount(1),
      http.get(apiUrl(freezesPath), () => jsonResponse([freeze])),
    );
    renderAdmin("/");

    const card = await screen.findByRole("region", { name: "Por resolver" });
    expect(await within(card).findByText("4 pendientes")).toBeVisible();
    const list = screen.getByRole("list", { name: "Pendientes" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Revisar", "/dinero/pagos"],
      ["Revisar", "/clientas/congelamientos"],
      ["Revisar", "/clientas/para-contactar"],
    ]);
    expect(within(list).getByText("2 pagos por revisar")).toBeVisible();
    expect(within(list).getByText("1 congelamiento por decidir")).toBeVisible();
  });

  it("says everything is up to date when nothing waits", async () => {
    renderAdmin("/");

    const card = await screen.findByRole("region", { name: "Por resolver" });
    expect(await within(card).findByText("Todo al día")).toBeVisible();
    expect(screen.getByText("Nada por resolver.")).toBeVisible();
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

  it("shows today's money for the whole studio and switches to the month", async () => {
    const ranges: string[] = [];
    server.use(
      http.get(apiUrl(incomeReportPath), ({ request }) => {
        const url = new URL(request.url);
        ranges.push(
          `${url.searchParams.get("from")}..${url.searchParams.get("until")}`,
        );
        return jsonResponse(emptyIncome(50_200, 30_000));
      }),
    );
    const { user } = renderAdmin("/");

    const money = await screen.findByRole("region", { name: "Dinero" });
    expect(await within(money).findByText("Bs 802")).toBeVisible();
    expect(within(money).getByText("Efectivo")).toBeVisible();
    expect(within(money).getByRole("button", { name: "Hoy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(within(money).getByRole("button", { name: "Mes" }));

    expect(within(money).getByRole("button", { name: "Mes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(new Set(ranges).size).toBe(2);
  });

  it("summarizes today's classes at the selected Branch", async () => {
    renderAdmin("/");

    const today = await screen.findByRole("region", { name: "Hoy en Centro" });
    expect(within(today).getByText("clases")).toBeVisible();
    expect(within(today).getByText("Sin clases hoy.")).toBeVisible();
  });
});

describe("Inicio for the Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  it("shows Clientas instead of Dinero and only the rows she settles", async () => {
    server.use(contactAlertsCount(3));
    renderAdmin("/");

    const card = await screen.findByRole("region", { name: "Por resolver" });
    expect(await within(card).findByText("3 pendientes")).toBeVisible();
    expect(
      await screen.findByRole("region", { name: "Clientas" }),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "Dinero" })).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(
      within(screen.getByRole("list", { name: "Pendientes" }))
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/clientas/para-contactar"]);
  });
});

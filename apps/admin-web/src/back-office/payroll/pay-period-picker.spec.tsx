import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const statementsPath = "/api/v1/administrator/pay-statements";

const statement = {
  id: "statement-1",
  staffMemberId: "emma",
  staffMemberName: "Emma Vargas",
  month: "2026-09-01",
  periodStart: "2026-09-07",
  periodEnd: "2026-09-14",
  state: "draft",
  totalCentavos: 13_000,
  salaryPaymentId: null,
  lines: [{ kind: "class", detail: "3 alumnas", amountCentavos: 6_500 }],
};

// BKO-009: Sueldos › Por aprobar is paid by Día · Semana · Rango · Mes.
describe("the pay period picker", () => {
  useMockServer();
  const asked: URLSearchParams[] = [];
  const drafted: URLSearchParams[] = [];

  beforeEach(() => {
    asked.length = 0;
    drafted.length = 0;
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(statementsPath), ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return jsonResponse([statement]);
      }),
      http.post(apiUrl(`${statementsPath}/draft`), ({ request }) => {
        drafted.push(new URL(request.url).searchParams);
        return jsonResponse({ drafted: 1 });
      }),
    );
  });

  const lastAsked = () => Object.fromEntries(asked[asked.length - 1] ?? []);

  it("opens on Mes and asks for the month, as before", async () => {
    renderAdmin("/dinero/sueldos?month=2026-09");

    expect(await screen.findByRole("radio", { name: "Mes" })).toBeChecked();
    expect(
      await screen.findByRole("heading", { name: "Emma Vargas" }),
    ).toBeInTheDocument();
    expect(lastAsked()).toEqual({ month: "2026-09" });
    expect(screen.getByText("Septiembre de 2026")).toBeInTheDocument();
  });

  it("steps one day at a time and keeps the day in the address", async () => {
    const { user, router } = renderAdmin(
      "/dinero/sueldos?month=2026-09&period=day&date=2026-09-07",
    );

    expect(await screen.findByRole("radio", { name: "Día" })).toBeChecked();
    expect(screen.getByText("Lunes 7 de septiembre de 2026")).toBeVisible();
    await waitFor(() =>
      expect(lastAsked()).toEqual({ from: "2026-09-07", until: "2026-09-08" }),
    );

    await user.click(screen.getByRole("button", { name: "Día siguiente" }));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        period: "day",
        date: "2026-09-08",
      }),
    );
    await waitFor(() =>
      expect(lastAsked()).toEqual({ from: "2026-09-08", until: "2026-09-09" }),
    );
  });

  it("asks for the whole week from its Monday and drafts it", async () => {
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(await screen.findByRole("radio", { name: "Semana" }));
    await user.click(screen.getByRole("button", { name: "Semana anterior" }));
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await user.click(screen.getByRole("button", { name: "Calcular" }));

    await waitFor(() => expect(drafted).toHaveLength(1));
    const week = Object.fromEntries(drafted[0]);
    expect(Object.keys(week)).toEqual(["from", "until"]);
    const days =
      (Date.parse(week.until) - Date.parse(week.from)) / (24 * 3_600_000);
    expect(days).toBe(7);
    expect(new Date(`${week.from}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it("asks for a range between two typed dates, the last one included", async () => {
    const { user } = renderAdmin("/dinero/sueldos?month=2026-09");

    await user.click(await screen.findByRole("radio", { name: "Rango" }));
    const from = screen.getByLabelText("Desde");
    const to = screen.getByLabelText("Hasta");
    await user.clear(from);
    await user.type(from, "15092026");
    await user.clear(to);
    await user.type(to, "30092026");

    await waitFor(() =>
      expect(lastAsked()).toEqual({ from: "2026-09-15", until: "2026-10-01" }),
    );
    expect(screen.getByText("Del 07/09/2026 al 13/09/2026")).toBeVisible();
  });

  it("refuses a range that ends before it starts", async () => {
    const { user } = renderAdmin(
      "/dinero/sueldos?month=2026-09&period=range&from=2026-09-20&to=2026-09-10",
    );

    expect(
      await screen.findByText(
        "La fecha final no puede ser anterior a la inicial.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calcular" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Mes" }));
    await waitFor(() => expect(lastAsked()).toEqual({ month: "2026-09" }));
  });
});

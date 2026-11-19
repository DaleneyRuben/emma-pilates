import { screen } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  andreaFirst,
  evaluationPage,
  evaluationsPath,
  lorena,
  veronica,
} from "../../test/oversight-fixtures";
import { staffMembersPath, staffPage } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

// Walkthrough finding 66 (FIX-056): on a Sunday the week on screen is empty
// while Monday already has an Evaluation. The subtitle names the next one
// instead of reading «ninguna evaluación agendada».
const weekFrom = "2026-09-21T04:00:00.000Z";
const reads: URLSearchParams[] = [];
const evaluations = (upcoming: typeof andreaFirst | null) =>
  http.get(apiUrl(evaluationsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    const week = params.get("from") === weekFrom;
    return jsonResponse(
      evaluationPage(week || upcoming === null ? [] : [upcoming]),
    );
  });

describe("AW25 subtitle when the week is empty", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(
      ...signedInHandlers(),
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse({ ...staffPage([veronica, lorena]), pageSize: 100 }),
      ),
    );
  });

  it("names the next Evaluation after this week", async () => {
    server.use(
      evaluations({ ...andreaFirst, startsAt: "2026-09-28T13:00:00.000Z" }),
    );
    renderAdmin("/horario/nutricion?week=2026-09-21");

    expect(
      await screen.findByText(
        "Sucursal Centro · ninguna en la semana · próxima: lun 28 sept · 09:00",
      ),
    ).toBeVisible();
    const upcoming = reads.find((params) => params.get("from") !== weekFrom);
    expect(upcoming?.get("pageSize")).toBe("1");
  });

  it("keeps «ninguna evaluación agendada» when nothing is ahead", async () => {
    server.use(evaluations(null));
    renderAdmin("/horario/nutricion?week=2026-09-21");

    expect(
      await screen.findByText("Sucursal Centro · ninguna evaluación agendada"),
    ).toBeVisible();
  });

  it("says only that the week is empty when the next one cannot be read", async () => {
    server.use(
      http.get(apiUrl(evaluationsPath), ({ request }) => {
        const params = new URL(request.url).searchParams;
        return params.get("from") === weekFrom
          ? jsonResponse(evaluationPage([]))
          : new Response(null, { status: 500 });
      }),
    );
    renderAdmin("/horario/nutricion?week=2026-09-21");

    expect(
      await screen.findByText("Sucursal Centro · ninguna en la semana"),
    ).toBeVisible();
  });
});

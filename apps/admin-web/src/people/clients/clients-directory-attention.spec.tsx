import { formatListDate } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday } from "../../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { clientPage, clientRow, clientsPath } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const today = boliviaToday();
const soon = addDays(today, 2);
const later = addDays(today, 20);

const carla = clientRow("Carla Prueba", {
  planEndsOn: later,
  lastClassOn: "2026-11-19",
});
const mariana = clientRow("Mariana Prueba", {
  planEndsOn: soon,
  lastClassOn: null,
});

const reads: URLSearchParams[] = [];
const clientTable = () =>
  http.get(apiUrl(clientsPath), ({ request }) => {
    reads.push(new URL(request.url).searchParams);
    return jsonResponse(
      clientPage([carla, mariana], {
        expiringClientCount: 2,
        unbookedClientCount: 3,
      }),
    );
  });

const chip = (name: string) =>
  within(screen.getByRole("group", { name: "Filtrar clientas" })).getByRole(
    "button",
    { name },
  );

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

// FIX-091 (W8 A): columns that say something and filters that help her act:
// «Por vencer» and «Sin reservar» with their counts, and «Última clase».
describe("Clientas › Todas, clear columns and useful filters", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
  });

  it("counts «Por vencer» and «Sin reservar» and filters by each", async () => {
    server.use(...signedInHandlers(), clientTable());
    const { user } = renderAdmin("/clientas");
    await rowOf("Carla Prueba");

    await user.click(chip("Por vencer · 2"));
    await waitFor(() => expect(reads.at(-1)?.get("filter")).toBe("expiring"));
    expect(chip("Por vencer · 2")).toHaveAttribute("aria-pressed", "true");

    await user.click(chip("Sin reservar · 3"));
    await waitFor(() => expect(reads.at(-1)?.get("filter")).toBe("unbooked"));
  });

  it("names her last class as a list date, and a dash without one", async () => {
    server.use(...signedInHandlers(), clientTable());
    renderAdmin("/clientas");

    const carlaRow = await rowOf("Carla Prueba");
    expect(
      within(carlaRow).getByRole("cell", { name: "jue 19 nov" }),
    ).toHaveAttribute("data-label", "Última clase");
    const marianaRow = await rowOf("Mariana Prueba");
    expect(
      within(marianaRow)
        .getAllByRole("cell")
        .find((cell) => cell.dataset.label === "Última clase"),
    ).toHaveTextContent("—");
  });

  it("marks only a Plan ending within 3 days with the Rubor pill", async () => {
    server.use(...signedInHandlers(), clientTable());
    renderAdmin("/clientas");

    const marianaRow = await rowOf("Mariana Prueba");
    expect(within(marianaRow).getByText(formatListDate(soon))).toHaveAttribute(
      "data-status-pill",
    );
    const carlaRow = await rowOf("Carla Prueba");
    expect(
      within(carlaRow).getByText(formatListDate(later)),
    ).not.toHaveAttribute("data-status-pill");
  });
});

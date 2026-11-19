import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { boliviaInstant, boliviaToday } from "../lib/bolivia-time";
import { server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  clearReportReads,
  incomeReads,
  reportHandlers,
} from "../test/report-handlers";
import { signedInHandlers } from "../test/session-handlers";
import { periodRange } from "./report-period";

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Dinero" });
const period = () => screen.getByRole("group", { name: "Período" });
const chip = (name: string) => within(period()).getByRole("button", { name });

// FIX-091 (W5 B): the period is chosen with chips; «Elegir fechas» opens
// the Desde and Hasta fields the page had.
describe("AW16 Reporte's period", () => {
  useMockServer();
  beforeEach(() => {
    clearReportReads();
    server.use(...signedInHandlers(), ...reportHandlers());
  });

  it("opens on this month when the address names no range", async () => {
    renderAdmin("/informes/dinero");
    await heading();

    const range = periodRange("month", boliviaToday());
    await waitFor(() => expect(incomeReads.length).toBeGreaterThan(0));
    expect(incomeReads[0]?.get("from")).toBe(
      boliviaInstant(range.from, "00:00"),
    );
    expect(chip("Este mes")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Desde")).toBeNull();
  });

  it("puts the chosen chip's range in the address", async () => {
    const { user, router } = renderAdmin("/informes/dinero");
    await heading();

    await user.click(chip("Últimos 3 meses"));

    const range = periodRange("quarter", boliviaToday());
    await waitFor(() =>
      expect(router.state.matches.at(-1)?.search).toMatchObject(range),
    );
    expect(chip("Últimos 3 meses")).toHaveAttribute("aria-pressed", "true");

    await user.click(chip("Últimos 6 meses"));
    await waitFor(() =>
      expect(router.state.matches.at(-1)?.search).toMatchObject(
        periodRange("half", boliviaToday()),
      ),
    );
  });

  it("opens the date fields from «Elegir fechas»", async () => {
    const { user } = renderAdmin("/informes/dinero");
    await heading();

    await user.click(chip("Elegir fechas"));

    expect(chip("Elegir fechas")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Desde")).toBeVisible();
    expect(screen.getByLabelText("Hasta")).toBeVisible();
  });

  it("keeps a new range in the address and refuses one that ends before it starts", async () => {
    const { router } = renderAdmin(
      "/informes/dinero?from=2026-08-01&to=2026-09-30",
    );
    await within(
      await screen.findByRole("region", { name: "Entró" }),
    ).findByText("Bs 2.280");
    // A range no chip names shows its fields.
    expect(chip("Elegir fechas")).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "01/09/2026" },
    });
    await waitFor(() =>
      expect(incomeReads.at(-1)?.get("from")).toBe("2026-09-01T04:00:00.000Z"),
    );
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
    });

    const reads = incomeReads.length;
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "15/08/2026" },
    });
    expect(
      await screen.findByText(
        "La fecha inicial no puede ser posterior a la final.",
      ),
    ).toBeVisible();
    expect(incomeReads).toHaveLength(reads);
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      to: "2026-09-30",
    });
  });
});

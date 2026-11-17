import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday } from "../../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
} from "../../test/payroll-fixtures";
import { promotionList, reformer } from "../../test/promotion-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

// Follow-up 266: each screen tells the calendar which days it may pick.
const calendar = () => screen.getByRole("dialog", { name: "Calendario" });
const dayButton = (date: string) => {
  const found = within(calendar())
    .getAllByRole("button")
    .find((button) => button.getAttribute("data-date") === date);
  if (found === undefined) throw new Error(`no day ${date} on screen`);
  return found;
};

describe("date limits on the admin web screens (finding 83)", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps a promotion's end on or after its start, with the range drawn", async () => {
    server.use(promotionList([reformer]));
    const { user } = renderAdmin("/promociones");
    await user.click(
      await screen.findByRole("button", { name: "Nueva promoción" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Nueva promoción",
    });
    await user.type(
      within(panel).getByLabelText("Fecha de inicio"),
      "20112026",
    );

    await user.click(within(panel).getByLabelText("Fecha de fin"));

    expect(dayButton("2026-11-19")).toHaveAttribute("aria-disabled", "true");
    expect(dayButton("2026-11-20")).toHaveAttribute("data-range", "start");
    await user.click(dayButton("2026-11-19"));
    expect(
      within(calendar()).getByText(
        "La fecha de fin no puede ser anterior a la de inicio.",
      ),
    ).toBeVisible();
  });

  it("keeps a salary payment on or before today", async () => {
    server.use(
      payrollStaffHandler(),
      http.get(apiUrl(salaryPaymentsPath), () => jsonResponse(salaryPage([]))),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await user.click(
      await screen.findByRole("button", { name: "Registrar pago" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Registrar pago",
    });
    const today = boliviaToday();
    const tomorrow = addDays(today, 1);

    await user.click(within(panel).getByLabelText("Fecha"));
    if (!tomorrow.startsWith(today.slice(0, 7))) {
      await user.click(
        within(calendar()).getByRole("button", { name: "Mes siguiente" }),
      );
    }

    expect(dayButton(tomorrow)).toHaveAttribute("aria-disabled", "true");
    await user.click(dayButton(tomorrow));
    expect(
      within(calendar()).getByText("La fecha no puede ser posterior a hoy."),
    ).toBeVisible();
  });
});

import type { PaymentReviewDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday, formatLongDay } from "../lib/bolivia-time";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import {
  paymentPage,
  paymentsPath,
  reviewOf,
  sofiaPayment,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

let review: PaymentReviewDto = reviewOf(sofiaPayment);

const openConfirmation = async () => {
  const { user } = renderAdmin("/dinero/pagos");
  await user.click(await screen.findByRole("button", { name: "Sofía Guzmán" }));
  const panel = await screen.findByRole("dialog", { name: "Revisar pago" });
  await within(panel).findByText("Monto a verificar");
  await user.click(
    within(panel).getByRole("button", { name: "Confirmar pago" }),
  );
  const dialog = await screen.findByRole("alertdialog", {
    name: "¿Confirmar el pago de Sofía Guzmán?",
  });
  return { dialog, user };
};

// A transfer bought for a later Start Date, or a renewal queued after the
// current Plan, does not start the day it is confirmed.
describe("AW29 names the Plan's real start", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(paymentsPath), () =>
        jsonResponse(paymentPage([sofiaPayment])),
      ),
      http.get(apiUrl(`${paymentsPath}/:paymentId`), () =>
        jsonResponse(review),
      ),
    );
  });

  it("says the later Start Date, before and after confirming", async () => {
    const startsOn = addDays(boliviaToday(), 3);
    review = { ...reviewOf(sofiaPayment), startsOn };
    server.use(
      http.post(apiUrl(`${paymentsPath}/${sofiaPayment.id}/confirm`), () =>
        jsonResponse({ ...review, state: "confirmed" }),
      ),
    );
    const { dialog, user } = await openConfirmation();

    expect(
      within(dialog).getByText(
        `Verifica que Bs 500,00 llegó a la cuenta del estudio. Al confirmar, su plan Paquete de 8 clases empieza el ${formatLongDay(startsOn)} y le avisamos.`,
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar pago" }),
    );
    expect(
      await screen.findByText(
        `Pago de Sofía Guzmán confirmado: su plan Paquete de 8 clases empieza el ${formatLongDay(startsOn)}.`,
      ),
    ).toBeInTheDocument();
  });

  it("says today for a Start Date already reached, as the confirmation moves it", async () => {
    review = {
      ...reviewOf(sofiaPayment),
      startsOn: addDays(boliviaToday(), -1),
    };
    const { dialog } = await openConfirmation();

    expect(
      within(dialog).getByText(
        /su plan Paquete de 8 clases empieza hoy y le avisamos\.$/,
      ),
    ).toBeInTheDocument();
  });

  // FIX-052 (walkthrough n.º 47): a transfer for her next Plan says so and
  // when it starts, in the panel, the dialog and the notice.
  it("names her next Plan and its start, before and after confirming", async () => {
    const startsOn = addDays(boliviaToday(), 55);
    review = { ...reviewOf(sofiaPayment), startsOn, nextPlan: true };
    server.use(
      http.post(apiUrl(`${paymentsPath}/${sofiaPayment.id}/confirm`), () =>
        jsonResponse({ ...review, state: "confirmed" }),
      ),
    );
    const { user } = renderAdmin("/dinero/pagos");
    await user.click(
      await screen.findByRole("button", { name: "Sofía Guzmán" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Revisar pago" });
    expect(
      await within(panel).findByText("Plan siguiente"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(`Empieza el ${formatLongDay(startsOn)}`),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Confirmar pago" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Confirmar el pago de Sofía Guzmán?",
    });
    expect(
      within(dialog).getByText(
        `Verifica que Bs 500,00 llegó a la cuenta del estudio. Al confirmar, su plan siguiente Paquete de 8 clases empieza el ${formatLongDay(startsOn)} y le avisamos.`,
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar pago" }),
    );
    expect(
      await screen.findByText(
        `Pago de Sofía Guzmán confirmado: plan siguiente programado desde el ${formatLongDay(startsOn)}.`,
      ),
    ).toBeInTheDocument();
  });

  it("shows a first Plan's later Start Date in the panel", async () => {
    const startsOn = addDays(boliviaToday(), 3);
    review = { ...reviewOf(sofiaPayment), startsOn, nextPlan: false };
    const { user } = renderAdmin("/dinero/pagos");
    await user.click(
      await screen.findByRole("button", { name: "Sofía Guzmán" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Revisar pago" });
    expect(await within(panel).findByText("Empieza")).toBeInTheDocument();
    expect(
      within(panel).getByText(formatLongDay(startsOn)),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("Plan siguiente")).toBeNull();
  });

  it("adds no start row for a Plan that starts today", async () => {
    review = { ...reviewOf(sofiaPayment), startsOn: boliviaToday() };
    const { user } = renderAdmin("/dinero/pagos");
    await user.click(
      await screen.findByRole("button", { name: "Sofía Guzmán" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Revisar pago" });
    await within(panel).findByText("Monto a verificar");
    expect(within(panel).queryByText("Empieza")).toBeNull();
    expect(within(panel).queryByText("Plan siguiente")).toBeNull();
  });
});

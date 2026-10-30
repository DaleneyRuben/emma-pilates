import type { PaymentReviewDto } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  paymentPage,
  paymentsPath,
  reviewOf,
  sofiaPayment,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const confirmPath = `${paymentsPath}/${sofiaPayment.id}/confirm`;
const rejectPath = `${paymentsPath}/${sofiaPayment.id}/reject`;
let listReads = 0;
let review: PaymentReviewDto = reviewOf(sofiaPayment);
const sent: { path: string; body: unknown }[] = [];

const decision = (path: string, respond: () => Response) =>
  http.post(apiUrl(path), async ({ request }) => {
    const text = await request.text();
    sent.push({
      path,
      body: text === "" ? null : (JSON.parse(text) as unknown),
    });
    return respond();
  });

const pageHandlers = () => [
  http.get(apiUrl(paymentsPath), ({ request }) => {
    if (new URL(request.url).searchParams.get("pageSize") === "1") {
      return undefined;
    }
    listReads += 1;
    return jsonResponse(paymentPage([sofiaPayment]));
  }),
  http.get(apiUrl(`${paymentsPath}/:paymentId`), () => jsonResponse(review)),
];

const openSofia = async () => {
  const rendered = renderAdmin("/back-office/pagos");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Sofía Guzmán" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Revisar pago" });
  await within(panel).findByText("Monto a verificar");
  return { ...rendered, panel };
};

const confirmFrom = async (
  panel: HTMLElement,
  user: ReturnType<typeof renderAdmin>["user"],
) => {
  await user.click(
    within(panel).getByRole("button", { name: "Confirmar pago" }),
  );
  const dialog = await screen.findByRole("alertdialog", {
    name: "¿Confirmar el pago de Sofía Guzmán?",
  });
  await user.click(
    within(dialog).getByRole("button", { name: "Confirmar pago" }),
  );
};

describe("AW29 decisions on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    listReads = 0;
    sent.length = 0;
    review = reviewOf(sofiaPayment);
    server.use(...signedInHandlers());
    server.use(...pageHandlers());
  });

  it("asks before confirming, then starts the Plan and returns to the list", async () => {
    server.use(
      decision(confirmPath, () =>
        jsonResponse({ ...review, state: "confirmed" }),
      ),
    );
    const { panel, user } = await openSofia();

    await user.click(
      within(panel).getByRole("button", { name: "Confirmar pago" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Confirmar el pago de Sofía Guzmán?",
    });
    expect(
      within(dialog).getByText(
        "Verifica que Bs 500,00 llegó a la cuenta del estudio. Al confirmar, su plan Paquete de 8 clases empieza hoy y le avisamos.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(sent).toEqual([]);

    const before = listReads;
    await confirmFrom(panel, user);

    expect(
      await screen.findByText(
        "Pago de Sofía Guzmán confirmado: su plan Paquete de 8 clases empieza hoy.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Revisar pago" }),
    ).not.toBeInTheDocument();
    expect(sent).toEqual([{ path: confirmPath, body: null }]);
    await waitFor(() => expect(listReads).toBeGreaterThan(before));
  });

  it("rejects only with a reason and sends it trimmed", async () => {
    server.use(
      decision(rejectPath, () =>
        jsonResponse({ ...review, state: "rejected" }),
      ),
    );
    const { panel, user } = await openSofia();

    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    const reason = within(panel).getByRole("textbox", {
      name: "Motivo del rechazo",
    });
    expect(reason).toHaveAttribute(
      "placeholder",
      "Ej. el monto no coincide con la transferencia recibida.",
    );
    expect(
      within(panel).getByText(
        "La clienta verá este mensaje para corregir y volver a enviar.",
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Confirmar pago" }),
    ).not.toBeInTheDocument();
    const submit = within(panel).getByRole("button", {
      name: "Confirmar rechazo",
    });
    expect(submit).toBeDisabled();

    await user.type(reason, "   ");
    expect(submit).toBeDisabled();
    await user.type(reason, "El monto no coincide.  ");
    await user.click(submit);

    expect(
      await screen.findByText(
        "Pago de Sofía Guzmán rechazado: le avisamos el motivo.",
      ),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      { path: rejectPath, body: { reason: "El monto no coincide." } },
    ]);
  });

  it("refuses a reason longer than the Client's message allows", async () => {
    const { panel, user } = await openSofia();

    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    const reason = within(panel).getByRole("textbox", {
      name: "Motivo del rechazo",
    });
    await user.click(reason);
    await user.paste("a".repeat(301));
    await user.click(
      within(panel).getByRole("button", { name: "Confirmar rechazo" }),
    );

    expect(
      await within(panel).findByText("Escribe hasta 300 caracteres."),
    ).toBeInTheDocument();
    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
  });

  it("goes back to both actions from the rejection, and keeps the reason while the receipt is enlarged", async () => {
    const { panel, user } = await openSofia();

    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    // The buttons are gone: focus moves to the reason, the next step.
    expect(
      within(panel).getByRole("textbox", { name: "Motivo del rechazo" }),
    ).toHaveFocus();
    await user.type(
      within(panel).getByRole("textbox", { name: "Motivo del rechazo" }),
      "No encuentro la transferencia",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Ver en grande" }),
    );
    await screen.findByRole("dialog", { name: "Comprobante ampliado" });
    await user.keyboard("{Escape}");

    expect(
      within(panel).getByRole("textbox", { name: "Motivo del rechazo" }),
    ).toHaveValue("No encuentro la transferencia");

    await user.click(within(panel).getByRole("button", { name: "Cancelar" }));
    expect(
      within(panel).getByRole("button", { name: "Confirmar pago" }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("textbox", { name: "Motivo del rechazo" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Rechazar" }),
    ).toHaveFocus();
  });

  it("shows the settled Payment when someone else decided it first", async () => {
    server.use(
      decision(confirmPath, () => {
        review = reviewOf(sofiaPayment, {
          state: "rejected",
          rejectionReason: "El monto no coincide.",
          decidedAt: "2026-09-21T19:00:00.000Z",
        });
        return problemResponse(409, "payment_confirmation_conflict");
      }),
    );
    const { panel, user } = await openSofia();
    const before = listReads;

    await confirmFrom(panel, user);

    expect(
      await within(panel).findByText("Otra persona ya decidió este pago."),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Rechazado")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Confirmar pago" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(listReads).toBeGreaterThan(before));
  });

  it("explains a confirmation refused because the Client already has an active Plan", async () => {
    server.use(
      decision(confirmPath, () =>
        problemResponse(409, "payment_confirmation_conflict"),
      ),
    );
    const { panel, user } = await openSofia();

    await confirmFrom(panel, user);

    expect(
      await within(panel).findByText(
        "No se puede confirmar: la clienta ya tiene un plan activo. Si el pago no corresponde, recházalo con el motivo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Rechazar" }),
    ).toBeEnabled();
  });

  it.each([
    [403, "booking_access_denied", "No tienes permiso para decidir pagos."],
    [
      404,
      "payment_not_found",
      "Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.",
    ],
    [
      409,
      "start_date_before_booked_class",
      "No se puede confirmar: la clienta tiene una clase reservada con su acceso actual el día de inicio o después. Cancela esa clase o espera a que pase, y vuelve a confirmar.",
    ],
    [
      500,
      "unexpected_error",
      "No pudimos registrar la decisión. Inténtalo de nuevo.",
    ],
  ])(
    "says why a %s %s confirmation did not go through",
    async (status, code, message) => {
      server.use(decision(confirmPath, () => problemResponse(status, code)));
      const { panel, user } = await openSofia();

      await confirmFrom(panel, user);

      expect(await within(panel).findByText(message)).toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: "Revisar pago" }),
      ).toBeInTheDocument();
    },
  );

  it("marks the reason when the backend refuses it", async () => {
    server.use(
      decision(rejectPath, () => problemResponse(400, "invalid_request")),
    );
    const { panel, user } = await openSofia();

    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    await user.type(
      within(panel).getByRole("textbox", { name: "Motivo del rechazo" }),
      "Motivo",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Confirmar rechazo" }),
    );

    expect(
      await within(panel).findByText(
        "Escribe un motivo de 1 a 300 caracteres.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the request never reached the studio", async () => {
    server.use(decision(confirmPath, () => HttpResponse.error()));
    const { panel, user } = await openSofia();

    await confirmFrom(panel, user);

    expect(
      await within(panel).findByText(
        "No pudimos registrar la decisión. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Confirmar pago" }),
    ).toBeEnabled();
  });
});

describe("AW29 decisions on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    sent.length = 0;
    review = reviewOf(sofiaPayment);
    server.use(...signedInHandlers());
    server.use(...pageHandlers());
  });

  it("confirms from the full-screen panel", async () => {
    server.use(
      decision(confirmPath, () =>
        jsonResponse({ ...review, state: "confirmed" }),
      ),
    );
    const { panel, user } = await openSofia();

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    await confirmFrom(panel, user);

    expect(
      await screen.findByText(
        "Pago de Sofía Guzmán confirmado: su plan Paquete de 8 clases empieza hoy.",
      ),
    ).toBeInTheDocument();
  });
});

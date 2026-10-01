import type { AdminClientDetailDto } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

let listReads = 0;
const closures: string[] = [];
const handlers = (
  detail: AdminClientDetailDto,
  close: () => Response = () =>
    jsonResponse({
      closedWaitlistEntries: 1,
      cancelledBookings: 3,
      cancelledEvaluations: 1,
      forfeitedClasses: 5,
      forfeitedCreditCentavos: 105_000,
    }),
) => [
  http.get(apiUrl(clientsPath), () => {
    listReads += 1;
    return jsonResponse(clientPage([lucia]));
  }),
  http.get(apiUrl(`${clientsPath}/:clientId`), () => jsonResponse(detail)),
  http.post(apiUrl(`${clientsPath}/:clientId/closure`), ({ params }) => {
    closures.push(String(params.clientId));
    return close();
  }),
];

const openDialog = async () => {
  const rendered = renderAdmin("/back-office/clientes");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  await rendered.user.click(
    await within(panel).findByRole("button", { name: "Cerrar cuenta" }),
  );
  return {
    ...rendered,
    dialog: await screen.findByRole("alertdialog", {
      name: "¿Cerrar la cuenta de Lucía Fernández?",
    }),
  };
};

describe("AW22 Cerrar cuenta", () => {
  useMockServer();
  beforeEach(() => {
    listReads = 0;
    closures.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists what closing does for this Client before asking to confirm", async () => {
    server.use(...handlers(luciaDetail));
    const { dialog } = await openDialog();

    for (const line of [
      "Se cancelan sus 3 reservas futuras y su evaluación nutricional, sin descontar nada.",
      "Sale de 1 lista de espera.",
      "Su plan Paquete de 8 clases termina hoy, sin reembolso; pierde las 5 clases que le quedan.",
      "Pierde su crédito de Bs 1.050,00.",
      "Se cierra su sesión en todos sus dispositivos y su correo queda libre.",
      "Su historial se conserva, pero deja de verse en la app y en las listas.",
      "Esta acción no se puede deshacer.",
    ]) {
      expect(within(dialog).getByText(line)).toBeInTheDocument();
    }
    expect(
      within(dialog).getByRole("button", { name: "Volver" }),
    ).toBeInTheDocument();
    expect(closures).toEqual([]);
  });

  it("names only the lines that always apply to a Client with nothing ahead", async () => {
    server.use(
      ...handlers({
        ...luciaDetail,
        subscription: { status: "none", subscription: null },
        creditAvailableCentavos: 0,
        closure: {
          futureBookingCount: 0,
          activeWaitlistEntryCount: 0,
          upcomingEvaluationCount: 0,
          transferPaymentPending: false,
        },
      }),
    );
    const { dialog } = await openDialog();

    expect(within(dialog).getAllByRole("listitem")).toHaveLength(2);
  });

  it("closes the Account, reloads Clientes, and says so above the table", async () => {
    server.use(...handlers(luciaDetail));
    const { dialog, user } = await openDialog();
    const readsBefore = listReads;

    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    );

    expect(
      await screen.findByText("Cuenta de Lucía Fernández cerrada."),
    ).toBeInTheDocument();
    expect(closures).toEqual([lucia.id]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Lucía Fernández" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(listReads).toBeGreaterThan(readsBefore));
  });

  it("keeps the dialog open and points to Pagos while a transfer awaits review", async () => {
    server.use(
      ...handlers(luciaDetail, () =>
        problemResponse(409, "closure_payment_pending"),
      ),
    );
    const { dialog, user } = await openDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    );

    expect(
      await within(dialog).findByText(
        "No se puede cerrar todavía: tiene un pago por transferencia en revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Ir a Pagos" }),
    ).toHaveAttribute("href", "/back-office/pagos");
    expect(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    ).toBeDisabled();
  });

  it("refuses up front when the summary already shows a pending transfer", async () => {
    server.use(
      ...handlers({
        ...luciaDetail,
        closure: { ...luciaDetail.closure, transferPaymentPending: true },
      }),
    );
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByRole("link", { name: "Ir a Pagos" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    ).toBeDisabled();
  });

  it("explains a failure and lets the Administrator try again", async () => {
    server.use(
      ...handlers(luciaDetail, () => problemResponse(500, "unexpected_error")),
    );
    const { dialog, user } = await openDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    );

    expect(
      await within(dialog).findByText(
        "No pudimos cerrar la cuenta. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Cerrar cuenta" }),
    ).toBeEnabled();
  });

  it("reads the summary afresh each time the panel opens, since it decides a closure", async () => {
    let bookings = 0;
    server.use(
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({
          ...luciaDetail,
          closure: { ...luciaDetail.closure, futureBookingCount: bookings },
        }),
      ),
    );
    const { dialog, user } = await openDialog();
    expect(
      within(dialog).queryByText(/reservas futuras/),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    await user.keyboard("{Escape}");
    bookings = 2;
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });
    await user.click(
      await within(panel).findByRole("button", { name: "Cerrar cuenta" }),
    );

    expect(
      await screen.findByText(/Se cancelan sus 2 reservas futuras/),
    ).toBeInTheDocument();
  });
});

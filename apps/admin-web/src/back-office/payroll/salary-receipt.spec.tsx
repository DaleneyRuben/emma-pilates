import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  emmaSeptember,
  payrollStaffHandler,
  salaryPage,
  salaryPaymentsPath,
  salaryRow,
} from "../../test/payroll-fixtures";
import { camila, emma } from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { imageFile } from "../../test/image-stubs";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../../test/upload-fixtures";

const receiptRoute = `${salaryPaymentsPath}/${emmaSeptember.id}/receipt`;
const withReceipt = { ...emmaSeptember, receiptUrl: receiptRoute };
const camilaSeptember = salaryRow("02", camila, 280_050, "2026-09-05");

const fileInput = (panel: HTMLElement) =>
  within(panel).getByLabelText("Archivo del comprobante");

// BKO-008, follow-up 224: AW12's optional receipt and AW11's column.
describe("Salary Payment receipts on the admin web", () => {
  useMockServer();
  const seen: UploadSeen = { polls: 0 };
  beforeEach(() => {
    seen.polls = 0;
    seen.declared = undefined;
    server.use(...signedInHandlers(), payrollStaffHandler());
  });

  it("shows which payments carry a receipt and opens it enlarged", async () => {
    server.use(
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([withReceipt, camilaSeptember])),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");

    expect(
      await screen.findByRole("columnheader", { name: "Comprobante" }),
    ).toBeInTheDocument();
    const camilaRow = screen
      .getByRole("button", { name: "Camila Rojas" })
      .closest("tr")!;
    expect(within(camilaRow).getByText("—")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ver comprobante de Emma Vargas" }),
    );

    const viewer = await screen.findByRole("dialog", {
      name: "Comprobante ampliado",
    });
    expect(within(viewer).getByRole("img")).toHaveAttribute(
      "src",
      receiptRoute,
    );
  });

  it("records a payment with the photo she uploads", async () => {
    const posted: unknown[] = [];
    server.use(
      ...uploadHandlers(seen),
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([emmaSeptember])),
      ),
      http.post(apiUrl(salaryPaymentsPath), async ({ request }) => {
        posted.push(await request.json());
        return jsonResponse(withReceipt, 201);
      }),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await screen.findByRole("button", { name: "Emma Vargas" });
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    const panel = await screen.findByRole("dialog", { name: "Registrar pago" });
    expect(
      within(panel).getByText(
        "JPG, PNG o WebP, hasta 10 MB. La entrenadora lo ve en su app.",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(within(panel).getByLabelText("Empleado"), emma.id);
    await user.type(within(panel).getByLabelText("Monto"), "3.500,00");
    await user.type(within(panel).getByLabelText("Fecha"), "20/09/2026");
    await user.upload(fileInput(panel), imageFile("transferencia.png"));
    expect(
      await within(panel).findByText("Comprobante adjunto"),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(seen.declared).toMatchObject({ purpose: "transfer_receipt" });
    expect(posted[0]).toMatchObject({ receiptImageAssetId: uploadedAssetId });
  });

  it("attaches a receipt to a payment already recorded", async () => {
    const puts: unknown[] = [];
    server.use(
      ...uploadHandlers(seen),
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([emmaSeptember])),
      ),
      http.put(
        apiUrl(`${salaryPaymentsPath}/${emmaSeptember.id}`),
        async ({ request }) => {
          puts.push(await request.json());
          return jsonResponse(withReceipt);
        },
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar pago" });

    await user.upload(fileInput(panel), imageFile("transferencia.png"));
    await within(panel).findByText("Comprobante adjunto");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({
      staffMemberId: emma.id,
      amountCentavos: 350_000,
      receiptImageAssetId: uploadedAssetId,
    });
  });

  it("shows the attached receipt when she edits the payment", async () => {
    server.use(
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([withReceipt])),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar pago" });

    expect(within(panel).getByText("Comprobante adjunto")).toBeInTheDocument();
    expect(within(panel).getByRole("img")).toHaveAttribute(
      "src",
      `${receiptRoute}?variant=thumbnail`,
    );
    expect(
      within(panel).getByRole("button", { name: "Cambiar" }),
    ).toBeInTheDocument();
  });

  it("refuses a photo over 10 MB before uploading it", async () => {
    server.use(
      ...uploadHandlers(seen),
      http.get(apiUrl(salaryPaymentsPath), () =>
        jsonResponse(salaryPage([emmaSeptember])),
      ),
    );
    const { user } = renderAdmin("/dinero/sueldos/pagados");
    await screen.findByRole("button", { name: "Emma Vargas" });
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    const panel = await screen.findByRole("dialog", { name: "Registrar pago" });
    const big = imageFile("enorme.jpg", "image/jpeg");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });

    await user.upload(fileInput(panel), big);

    expect(
      await within(panel).findByText("La imagen pesa más de 10 MB."),
    ).toBeInTheDocument();
    expect(seen.declared).toBeUndefined();
  });
});

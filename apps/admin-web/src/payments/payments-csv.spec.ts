import { paymentRow } from "../test/payment-fixtures";
import { paymentsCsv, paymentsCsvName } from "./payments-csv";

const issuedCash = paymentRow("11", "Ana Pérez", {
  method: "cash",
  state: "confirmed",
  planPriceCentavos: 105_000,
  amountDueCentavos: 105_000,
  decidedAt: "2026-10-22T14:00:00.000Z",
  invoiceData: { taxId: "4567891", name: "Ana Pérez" },
  invoiceIssued: {
    issuedAt: "2026-10-23T02:30:00.000Z",
    issuedByName: "Paola Mendoza",
  },
});
const pendingTransfer = paymentRow("12", "Lucía Fernández", {
  creditAppliedCentavos: 6_000,
  amountDueCentavos: 50_000,
});

// PAY-007, follow-up 147 §4: the accountant's CSV of AW28's filtered rows.
describe("the Pagos CSV", () => {
  it("writes one row per sale with its invoice data and mark, in Bolivia dates", () => {
    expect(paymentsCsv([issuedCash, pendingTransfer])).toBe(
      "\uFEFFFecha,Cliente,Plan,Método,Monto (Bs),Estado,NIT o CI,Nombre o razón social,Factura emitida,Emitida por,Emitida el\r\n" +
        "21/09/2026,Ana Pérez,Paquete de 8 clases,Efectivo,1050.00,Confirmado,4567891,Ana Pérez,Sí,Paola Mendoza,22/10/2026\r\n" +
        "21/09/2026,Lucía Fernández,Paquete de 8 clases,Transferencia,500.00,Pendiente,,,No,,\r\n",
    );
  });

  it("names the file after the Bolivia date of the export", () => {
    expect(paymentsCsvName(new Date("2026-10-24T02:00:00.000Z"))).toBe(
      "pagos-2026-10-23.csv",
    );
  });
});

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { sellForCash } from "./support/api";
import { signIn } from "./support/session";

// PAY-007 (follow-up 147) and FIX-044 (follow-up 248) through the real
// backend and worker: a cash sale with Invoice Data waits under «Factura por
// subir», the CSV holds exactly what the filter shows, and uploading the
// issued PDF marks it «Emitida» with who uploaded it.
test("exports the unbilled sales and uploads a cash sale's invoice", async ({
  page,
}) => {
  // Renata holds no Plan and no transfer. A pending Payment or a Plan
  // still in use blocks a cash sale, and every fixture Client has one.
  await sellForCash("renata@example.com", {
    taxId: "4567891",
    name: "Renata Soliz",
  });
  await signIn(page, "/dinero/pagos?status=all&invoice=unissued");

  const row = page.getByRole("row", { name: /Renata Soliz/ });
  await expect(row.getByText("Efectivo")).toBeVisible();
  await expect(row.getByText("4567891")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toMatch(/^pagos-\d{4}-\d{2}-\d{2}\.csv$/);
  const lines = (await readFile(await saved.path(), "utf8"))
    .split("\r\n")
    .filter((line) => line !== "");
  expect(lines).toHaveLength(2);
  expect(lines[1]).toContain("Renata Soliz,Plan,Paquete de 8 clases,Efectivo,");
  expect(lines[1]).toMatch(/,Confirmado,4567891,Renata Soliz,No,,$/);

  await row
    .getByRole("button", { name: "Subir factura: Renata Soliz" })
    .click();
  const panel = page.getByRole("dialog", { name: "Factura" });
  await panel.getByLabel("Archivo de la factura").setInputFiles({
    name: "factura-000123.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n%%EOF\n"),
  });
  const fileLink = panel.getByRole("link", { name: "Descargar factura" });
  await expect(fileLink).toBeVisible({ timeout: 30_000 });
  const pdf = page.waitForEvent("download");
  await fileLink.click();
  expect((await pdf).suggestedFilename()).toBe("factura-000123.pdf");
  await page.keyboard.press("Escape");
  await expect(page.getByText("No hay facturas pendientes.")).toBeVisible();

  await page.goto("/dinero/pagos?status=all");
  const issued = page
    .getByRole("row", { name: /Renata Soliz/ })
    .filter({ hasText: "Efectivo" });
  await expect(issued.getByText("Emitida", { exact: true })).toBeVisible();
  await expect(issued.getByText(/^por Paola Mendoza · /)).toBeVisible();
});

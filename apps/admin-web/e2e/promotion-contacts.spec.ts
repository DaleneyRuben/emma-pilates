import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { closeOwnAccount } from "./support/api";
import { boliviaToday, formatCivilDate } from "./support/bolivia";
import { signIn } from "./support/session";

// AW35 through the real backend: a Client who closed her own Account and
// asked to keep hearing from the studio (ADR-0097) is listed, searched,
// exported, and erased.
test("lists, exports, and withdraws a Promotion Contact", async ({ page }) => {
  await closeOwnAccount("valeria@example.com", { keepPromotions: true });
  await signIn(page, "/promociones");
  await page.getByRole("link", { name: "Contactos para promociones" }).click();

  await expect(page).toHaveURL(/\/promociones\/contactos/);
  await expect(page.getByRole("link", { name: "← Promociones" })).toBeVisible();
  const row = page.getByRole("row", { name: /Valeria Quiroga/ });
  await expect(row.getByRole("cell", { name: "Cuenta cerrada" })).toBeVisible();
  await expect(
    row.getByRole("cell", { name: "valeria@example.com" }),
  ).toBeVisible();
  await expect(row.getByText("+591 70011002")).toBeVisible();
  await expect(row.getByText(formatCivilDate(boliviaToday()))).toBeVisible();
  await expect(page.getByText("Mostrando 1 de 1 contacto")).toBeVisible();

  const search = page.getByRole("searchbox");
  await search.fill("quiroga");
  await expect(page).toHaveURL(/q=quiroga/);
  await expect(row).toBeVisible();
  await search.fill("nadie");
  await expect(page.getByText("No se encontró ningún contacto.")).toBeVisible();
  await search.fill("");
  await expect(row).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(
    /^contactos-promociones-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const path = await file.path();
  const csv = readFileSync(path, "utf8");
  expect(csv.startsWith("﻿Nombre,Tipo,Correo,Teléfono,Aceptó el\r\n")).toBe(
    true,
  );
  expect(csv).toContain(
    `Valeria Quiroga,Cuenta cerrada,valeria@example.com,+591 70011002,${formatCivilDate(boliviaToday())}\r\n`,
  );

  await row
    .getByRole("button", { name: "Dejar de enviar a Valeria Quiroga" })
    .click();
  const dialog = page.getByRole("alertdialog", {
    name: "¿Dejar de enviar promociones a Valeria Quiroga?",
  });
  await expect(
    dialog.getByText("Esta acción no se puede deshacer."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Borrar contacto" }).click();

  await expect(
    page.getByText("Borramos el contacto de Valeria Quiroga."),
  ).toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("Todavía no hay contactos.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exportar CSV" }),
  ).toBeDisabled();
});

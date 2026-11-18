import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { closeOwnAccount } from "./support/api";
import { boliviaToday, formatCivilDate } from "./support/bolivia";
import { signIn } from "./support/session";

// FIX-065 (walkthrough finding 91, follow-up 268) through the real backend.
// The file keeps AW35's name so it still runs after the journeys that need
// Valeria's open Account (clients, horario-booking):
// a Client who closed her own Account and asked to keep hearing from the
// studio (ADR-0097) is Clientas › «Cuenta cerrada», never under the other
// chips; she is searched, exported, and erased there, and «Exportar CSV»
// downloads what each chip shows.
test("lists a closed account under Cuenta cerrada, exports, and withdraws it", async ({
  page,
}) => {
  await closeOwnAccount("valeria@example.com", { keepPromotions: true });
  // The old Contactos address opens the chip.
  await signIn(page, "/promociones/contactos");
  await expect(page).toHaveURL(/\/clientas\?.*filter=closed/);
  const chips = page.getByRole("group", { name: "Filtrar clientas" });
  await expect(
    chips.getByRole("button", { name: "Cuenta cerrada" }),
  ).toHaveAttribute("aria-pressed", "true");

  const row = page.getByRole("row", { name: /Valeria Quiroga/ });
  await expect(row.getByRole("cell", { name: "Cuenta cerrada" })).toBeVisible();
  await expect(row.getByText("valeria@example.com")).toBeVisible();
  await expect(row.getByText("+591 70011002")).toBeVisible();
  await expect(row.getByText(formatCivilDate(boliviaToday()))).toBeVisible();
  // Live Clients are never here.
  await expect(page.getByRole("row", { name: /Mariana Peña/ })).toHaveCount(0);

  const search = page.getByRole("searchbox");
  await search.fill("quiroga");
  await expect(page).toHaveURL(/q=quiroga/);
  await expect(row).toBeVisible();
  await search.fill("nadie");
  await expect(
    page.getByText("No se encontró ninguna exclienta."),
  ).toBeVisible();
  await search.fill("");
  await expect(row).toBeVisible();

  const closedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const closedFile = await closedDownload;
  expect(closedFile.suggestedFilename()).toMatch(
    /^clientas-cuenta-cerrada-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const closedCsv = readFileSync(await closedFile.path(), "utf8");
  expect(closedCsv.startsWith("﻿Nombre,Estado,Correo,Teléfono,Desde\r\n")).toBe(
    true,
  );
  expect(closedCsv).toContain(
    `Valeria Quiroga,Cuenta cerrada,valeria@example.com,+591 70011002,${formatCivilDate(boliviaToday())}\r\n`,
  );
  expect(closedCsv).not.toContain("Mariana Peña");
  await expect(
    page.getByText(/^Descargamos clientas-cuenta-cerrada-/),
  ).toBeVisible();

  // Under «Todas» she is gone, and the export holds the live Clients only.
  await chips.getByRole("button", { name: "Todas" }).click();
  await expect(page.getByRole("row", { name: /Mariana Peña/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Valeria Quiroga/ })).toHaveCount(
    0,
  );
  const allDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const allFile = await allDownload;
  expect(allFile.suggestedFilename()).toMatch(
    /^clientas-todas-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const allCsv = readFileSync(await allFile.path(), "utf8");
  // Earlier journeys may have sold Mariana a Plan: her state varies.
  expect(allCsv).toMatch(
    /\r\nMariana Peña,(Activo|Sin plan|Expirado),mariana@example\.com,/,
  );
  expect(allCsv).not.toContain("Valeria Quiroga");

  await chips.getByRole("button", { name: "Cuenta cerrada" }).click();
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
  await expect(
    page.getByText(
      "Nadie cerró su cuenta pidiendo seguir recibiendo promociones.",
    ),
  ).toBeVisible();
});

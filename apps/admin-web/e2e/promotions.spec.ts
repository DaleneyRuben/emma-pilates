import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/session";

// AW17/AW18 through the real backend: the fresh database holds no
// Promotion, so the journey creates two drafts without an image, drags one
// above the other, reloads to see the saved order, and deletes one.
const createDraft = async (page: Page, headline: string) => {
  await page.getByRole("button", { name: "Nueva promoción" }).click();
  const panel = page.getByRole("dialog", { name: "Nueva promoción" });
  await expect(panel.getByText("Entrará al final del carrusel")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Publicar" })).toBeDisabled();
  await panel.getByLabel("Título").fill(headline);
  await panel
    .getByLabel("Descripción")
    .fill("Una novedad del estudio para todas las clientas.");
  await panel.getByLabel("Fecha de inicio").fill("2026-10-01");
  await panel.getByLabel("Fecha de fin").fill("2026-10-31");
  await panel.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(
    page.getByText(`Promoción «${headline}» guardada como borrador.`),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
};

const headlines = (page: Page) =>
  page
    .getByRole("list", { name: "Promociones en el orden del carrusel" })
    .getByRole("article")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("aria-label")),
    );

test("lists, drafts, reorders by dragging, and deletes Promotions", async ({
  page,
}) => {
  await signIn(page, "/promociones");
  await expect(page.getByText("Todavía no hay promociones.")).toBeVisible();
  await expect(
    page.getByText("Ninguna promoción en el carrusel"),
  ).toBeVisible();

  await createDraft(page, "Horario de fin de año");
  await createDraft(page, "Nueva sala de Reformer");
  await expect(
    page.getByText("2 promociones · arrastra para cambiar el orden"),
  ).toBeVisible();
  const first = page.getByRole("article", { name: "Horario de fin de año" });
  await expect(first.getByText("Borrador")).toBeVisible();
  await expect(first.getByText("Del 01/10/2026 al 31/10/2026")).toBeVisible();
  await expect(first.getByText("Sin imagen")).toBeVisible();
  expect(await headlines(page)).toEqual([
    "Horario de fin de año",
    "Nueva sala de Reformer",
  ]);

  // Drag the second card's handle above the first card.
  const handle = page.getByRole("button", {
    name: "Mover Nueva sala de Reformer",
  });
  const target = await first.boundingBox();
  const grip = await handle.boundingBox();
  if (target === null || grip === null) throw new Error("cards not laid out");
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, target.y + 4, { steps: 12 });
  await expect(page.getByText("Soltar en posición 1")).toBeVisible();
  await page.mouse.up();

  // The page notice from the draft is a status too; the drop's live region
  // is the one naming the drop.
  await expect(
    page.getByRole("status").filter({ hasText: "soltada" }),
  ).toHaveText(
    "Nueva sala de Reformer soltada en la posición 1. Orden guardado.",
  );
  expect(await headlines(page)).toEqual([
    "Nueva sala de Reformer",
    "Horario de fin de año",
  ]);
  await page.reload();
  await expect(
    page
      .getByRole("article", { name: "Nueva sala de Reformer" })
      .getByText("Posición 1"),
  ).toBeAttached();
  expect(await headlines(page)).toEqual([
    "Nueva sala de Reformer",
    "Horario de fin de año",
  ]);

  // The handle is "Mover Horario de fin de año"; the headline opens the panel.
  await page
    .getByRole("button", { name: "Horario de fin de año", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Editar promoción" });
  await expect(panel.getByText("Posición 2 en el carrusel")).toBeVisible();
  await panel.getByRole("button", { name: "Eliminar promoción" }).click();
  await page
    .getByRole("alertdialog", {
      name: "¿Eliminar la promoción «Horario de fin de año»?",
    })
    .getByRole("button", { name: "Eliminar" })
    .click();

  await expect(
    page.getByText("Promoción «Horario de fin de año» eliminada."),
  ).toBeVisible();
  await expect(page.getByText("1 promoción en el carrusel")).toBeVisible();
  expect(await headlines(page)).toEqual(["Nueva sala de Reformer"]);
});

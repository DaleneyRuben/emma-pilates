import { expect, test } from "@playwright/test";
import { createEmptySessionTomorrow } from "./support/api";
import { boliviaDateTime, weekStartOf } from "./support/bolivia";
import { signIn } from "./support/session";

// Playwright runs the files in name order, and this one's name keeps it
// between two that need Valeria as the fixtures left her:
// `coordinator.spec.ts` counts her among the Clients to contact (no Booking
// yet), and `promotion-contacts.spec.ts` closes her Account afterwards.
// FIX-058 (walkthrough finding 77): Horario › a class › «Reservar a una
// clienta» books her through the admin web's cookie, and the class says so.
test("books a Client into a class from Horario", async ({ page }) => {
  const { startsAt } = await createEmptySessionTomorrow();
  const { date, time } = boliviaDateTime(startsAt);
  await signIn(page, `/horario?week=${weekStartOf(date)}`);

  await page
    .getByRole("table", { name: "Semana" })
    .getByRole("button", {
      name: new RegExp(`Reformer Pilates, ${time}, Emma Vargas, 0 de 6`),
    })
    .click();
  const detail = page.getByRole("dialog", { name: "Editar sesión" });
  await expect(detail.getByText("Nadie reservó todavía.")).toBeVisible();
  await detail.getByRole("button", { name: "Reservar a una clienta" }).click();

  const booking = page.getByRole("dialog", { name: "Reservar a una clienta" });
  await booking.getByLabel("Buscar clienta").fill("Valeria");
  await booking
    .getByRole("button", { name: "Elegir a Valeria Quiroga" })
    .click();
  await expect(
    booking.getByText("¿Reservar a Valeria Quiroga en esta clase?"),
  ).toBeVisible();
  await booking.getByRole("button", { name: "Confirmar la reserva" }).click();

  await expect(page).toHaveURL(/\/horario/);
  await expect(detail.getByRole("status")).toHaveText(
    "Valeria Quiroga quedó reservada.",
  );
  const booked = detail.getByRole("region", { name: "Reservaron (1)" });
  await expect(booked.getByText("Valeria Quiroga")).toBeVisible();
});

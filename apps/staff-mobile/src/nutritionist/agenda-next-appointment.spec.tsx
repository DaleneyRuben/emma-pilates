import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { formatListDate } from "@pilates/api-contracts";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking } from "react-native";

import { jsonResponse, routeFetcher } from "../test-support";
import { entry, inDays, openApp, page, routes } from "./nutritionist-test-support";

jest.setTimeout(30_000);
jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

const agendaOf = (items: unknown[]) =>
  routeFetcher(routes({ "/api/v1/nutritionist/evaluations": () => jsonResponse(page(items)) }));

// E5 B «Próxima cita grande» (owner 2026-11-19): the next appointment in a
// Palo de rosa block with WhatsApp, the rest under «Después» with day and payment.
describe("Nutritionist agenda: next appointment", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the next appointment in the Palo de rosa block", async () => {
    const screen = await openApp(
      agendaOf([
        {
          ...entry("evaluation-1", inDays(1), "09:45", "Valeria Áñez", "first"),
          clientPhone: "+591 70011001",
          paymentConfirmed: true,
        },
        entry("evaluation-2", inDays(3), "11:15", "Lucía Justiniano", "follow_up"),
      ]),
    );

    const hero = within(await screen.findByTestId("next-appointment"));
    expect(screen.getByTestId("next-appointment")).toHaveStyle({ backgroundColor: "#B78380" });
    expect(hero.getByText("Próxima cita")).toBeOnTheScreen();
    expect(hero.getByText("Mañana · 09:45")).toHaveStyle({ color: "#F9F4F2" });
    expect(hero.getByText("VÁ")).toBeOnTheScreen();
    expect(hero.getByText("Valeria Áñez")).toBeOnTheScreen();
    expect(hero.getByText("Primera evaluación · 45 min · Pagada")).toBeOnTheScreen();
    expect(hero.getByTestId("cancel-evaluation-evaluation-1")).toBeOnTheScreen();

    await fireEvent.press(hero.getByRole("button", { name: "Escribirle por WhatsApp" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/59170011001");
  });

  it("lists the rest under «Después» with their day and payment", async () => {
    const screen = await openApp(
      agendaOf([
        entry("evaluation-1", inDays(1), "09:45", "Valeria Áñez", "first"),
        {
          ...entry("evaluation-2", inDays(3), "11:15", "Lucía Justiniano", "follow_up"),
          paymentConfirmed: true,
        },
        entry("evaluation-3", inDays(4), "10:30", "Carla Prueba", "first"),
      ]),
    );

    await screen.findByTestId("next-appointment");
    expect(screen.getByText("Después")).toBeOnTheScreen();
    expect(
      screen.getByText(`${formatListDate(inDays(3))} · Seguimiento · Pagada`),
    ).toBeOnTheScreen();
    expect(screen.getByText(`${formatListDate(inDays(4))} · Primera evaluación`)).toBeOnTheScreen();
    expect(screen.getByLabelText("11:15 Lucía Justiniano")).toBeOnTheScreen();
    expect(screen.getByTestId("cancel-evaluation-evaluation-2")).toBeOnTheScreen();
    expect(screen.getByTestId("cancel-evaluation-evaluation-3")).toBeOnTheScreen();
  });

  it("says why there is no WhatsApp when her phone cannot open it", async () => {
    const screen = await openApp(
      agendaOf([entry("evaluation-1", inDays(1), "09:45", "Valeria Áñez", "first")]),
    );

    const hero = within(await screen.findByTestId("next-appointment"));
    expect(hero.queryByRole("button", { name: "Escribirle por WhatsApp" })).toBeNull();
    expect(hero.getByText("Sin teléfono para WhatsApp")).toBeOnTheScreen();
    expect(screen.queryByText("Después")).toBeNull();
  });

  it("cancels the next appointment from inside the block", async () => {
    let cancelled = false;
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/evaluations": () =>
          jsonResponse(
            page(
              cancelled ? [] : [entry("evaluation-1", inDays(1), "09:45", "Valeria Áñez", "first")],
            ),
          ),
        "DELETE /api/v1/nutritionist/evaluations/evaluation-1": () => {
          cancelled = true;
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openApp(fetcher);

    await fireEvent.press(await screen.findByTestId("cancel-evaluation-evaluation-1"));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));

    expect(await screen.findByText("Evaluación cancelada")).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText("No tienes evaluaciones")).toBeOnTheScreen());
  });
});

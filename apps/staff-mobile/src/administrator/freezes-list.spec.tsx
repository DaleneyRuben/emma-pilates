import type { FreezeReviewDto } from "@pilates/api-contracts";
import { clearMobileQueryCache, typography } from "@pilates/mobile-core";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  administratorProfile,
  approvedFreeze,
  refusedFreeze,
  requestedFreeze,
} from "./freeze-fixtures";

jest.setTimeout(30_000);

const explanation = "Pausan el plan de la clienta. Los días congelados se suman a su vencimiento.";

const openFreezes = async (
  requested: FreezeReviewDto[],
  decided: FreezeReviewDto[] | null,
  entry: string,
) => {
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () => jsonResponse(administratorProfile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "/api/v1/administrator/freezes": () => jsonResponse(requested),
    ...(decided === null
      ? {}
      : { "/api/v1/administrator/freezes/decided": () => jsonResponse(decided) }),
    ...Object.fromEntries(
      [...requested, ...(decided ?? [])].map((freeze) => [
        `/api/v1/administrator/freezes/${freeze.id}`,
        () => jsonResponse(freeze),
      ]),
    ),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() => expect(screen.getByRole("button", { name: entry })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: entry }));
  await waitFor(() =>
    expect(screen.getByRole("header", { name: "Congelamientos" })).toBeOnTheScreen(),
  );
  return screen;
};

describe("freezes list", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("heads the list like Facturas and explains freezes in a roomy note", async () => {
    const screen = await openFreezes([requestedFreeze], [], "Congelamientos, 1 por revisar");

    await waitFor(() => expect(screen.getByText("Por revisar · 1")).toBeOnTheScreen());
    // Walkthrough finding 52: the title sits in the bar, as on Facturas and
    // Cancelar una clase, instead of a cramped subtitle under it.
    expect(
      StyleSheet.flatten(screen.getByRole("header", { name: "Congelamientos" }).props.style),
    ).toMatchObject({ fontSize: 24 });
    expect(StyleSheet.flatten(screen.getByText(explanation).props.style)).toMatchObject({
      fontSize: typography.note,
    });
  });

  it("shows the dates and days whole, with the reason on its own line", async () => {
    const screen = await openFreezes([requestedFreeze], [], "Congelamientos, 1 por revisar");

    await waitFor(() => expect(screen.getByText("9 al 15 nov · 7 días")).toBeOnTheScreen());
    expect(screen.getByText("9 al 15 nov · 7 días").props.numberOfLines).toBeUndefined();
    expect(screen.getByText("Viaje de trabajo")).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Revisar congelamiento de Lucía Fernández" }),
    );
    await waitFor(() => expect(screen.getByLabelText("Revisar congelamiento")).toBeOnTheScreen());
  });

  it("lists the decided requests under the pending ones and opens them", async () => {
    const screen = await openFreezes(
      [requestedFreeze],
      [approvedFreeze, refusedFreeze],
      "Congelamientos, 1 por revisar",
    );

    await waitFor(() => expect(screen.getByText("Decididas")).toBeOnTheScreen());
    expect(screen.getByText("Ana Rojas")).toBeOnTheScreen();
    expect(screen.getByText("30 nov al 4 dic · 5 días")).toBeOnTheScreen();
    expect(screen.getByText("Aprobada · ahora vence el 15 ene")).toBeOnTheScreen();
    expect(screen.getByText("Carla Vaca")).toBeOnTheScreen();
    expect(screen.getByText("Rechazada")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver congelamiento de Ana Rojas" }));
    await waitFor(() =>
      expect(
        screen.getByText("Aprobada por Paola Mendoza el 8 de noviembre a las 10:15"),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByRole("button", { name: "Aprobar congelamiento" })).toBeNull();
  });

  it("keeps the decided section when nothing waits for review", async () => {
    const screen = await openFreezes([], [approvedFreeze], "Congelamientos");

    await waitFor(() =>
      expect(screen.getByText("No hay solicitudes por revisar")).toBeOnTheScreen(),
    );
    await waitFor(() => expect(screen.getByText("Decididas")).toBeOnTheScreen());
    expect(screen.getByText("Ana Rojas")).toBeOnTheScreen();
  });

  it("still lists the pending requests when an older API has no decided list", async () => {
    const screen = await openFreezes([requestedFreeze], null, "Congelamientos, 1 por revisar");

    await waitFor(() => expect(screen.getByText("Por revisar · 1")).toBeOnTheScreen());
    expect(screen.queryByText("Decididas")).toBeNull();
  });
});

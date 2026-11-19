import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { FreezeReviewDto } from "@pilates/api-contracts";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { approvedFreeze, refusedFreeze, requestedFreeze } from "./freeze-fixtures";

jest.setTimeout(30_000);

const freeze = {
  id: "freeze-1",
  clientName: "Lucía Fernández",
  planName: "Trimestral 36 clases",
  startsOn: "2026-10-27",
  endsOn: "2026-11-03",
  reason: "Viaje de trabajo",
  state: "requested",
};

const profile = {
  id: "staff-1",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

const openReview = async (
  review: FreezeReviewDto,
  entry: string,
  rowLabel = "Revisar congelamiento de",
) => {
  const requested = review.state === "requested";
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "/api/v1/administrator/freezes": () => jsonResponse(requested ? [review] : []),
    "/api/v1/administrator/freezes/decided": () => jsonResponse(requested ? [] : [review]),
    [`/api/v1/administrator/freezes/${review.id}`]: () => jsonResponse(review),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() => expect(screen.getByRole("button", { name: entry })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: entry }));
  const row = `${rowLabel} ${review.clientName}`;
  await waitFor(() => expect(screen.getByRole("button", { name: row })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: row }));
  await waitFor(() => expect(screen.getByLabelText("Revisar congelamiento")).toBeOnTheScreen());
  await waitFor(() => expect(screen.getByText(review.planName)).toBeOnTheScreen());
  return screen;
};

describe("freeze review", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names a freeze that already started", async () => {
    const fetcher = routeFetcher({
      "/api/v1/staff-members/current": () => jsonResponse(profile),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
      "/api/v1/notifications": () =>
        jsonResponse({
          items: [
            {
              id: "n1",
              category: "booking_schedule",
              type: "freeze_requested",
              title: "Congelamiento",
              message: "Lucía pidió un congelamiento.",
              destinationType: "freeze",
              destinationId: freeze.id,
              createdAt: "2026-10-29T15:00:00.000Z",
              readAt: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        }),
      [`/api/v1/administrator/freezes/${freeze.id}`]: () => jsonResponse(freeze),
      [`POST /api/v1/administrator/freezes/${freeze.id}/decision`]: () =>
        jsonResponse(
          {
            code: "freeze_start_in_past",
            detail: "The freeze already started",
          },
          409,
        ),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
    await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
    await waitFor(() =>
      expect(screen.getByText("Lucía pidió un congelamiento.")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByText("Lucía pidió un congelamiento."));
    await waitFor(() => expect(screen.getByText("Lucía Fernández")).toBeOnTheScreen());
    // iPad walk: the scroller holding the BackBar reaches the screen edge, so
    // the chevron's negative margin is not clipped.
    let scroller = screen.getByTestId("back-bar").parent;
    while (scroller && scroller.props.contentContainerStyle === undefined) {
      scroller = scroller.parent;
    }
    expect(StyleSheet.flatten(scroller?.props.style)).toMatchObject({ marginHorizontal: -20 });
    expect(StyleSheet.flatten(scroller?.props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: 20,
    });
    // v2 CON: the request as rows, the days counted.
    expect(screen.getByText("Del mar 27 oct al mar 3 nov")).toBeOnTheScreen();
    expect(screen.getByText("8 días")).toBeOnTheScreen();
    expect(screen.getByText("Viaje de trabajo")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Aprobar congelamiento" }));
    await waitFor(() =>
      expect(
        screen.getByText("El congelamiento ya empezó. Recházalo y pide uno desde mañana."),
      ).toBeOnTheScreen(),
    );
  });

  // FIX-089: a destructive action goes through a confirmation step.
  it("asks before refusing a freeze and refuses only once confirmed", async () => {
    const decisions: string[] = [];
    const fetcher = routeFetcher({
      "/api/v1/staff-members/current": () => jsonResponse(profile),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
      "/api/v1/administrator/payments/pending": () => jsonResponse([]),
      "/api/v1/administrator/freezes": () => jsonResponse([requestedFreeze]),
      "/api/v1/administrator/freezes/decided": () => jsonResponse([]),
      [`/api/v1/administrator/freezes/${requestedFreeze.id}`]: () => jsonResponse(requestedFreeze),
      [`POST /api/v1/administrator/freezes/${requestedFreeze.id}/decision`]: (init) => {
        decisions.push(String(init?.body));
        return jsonResponse({ ...requestedFreeze, state: "refused" });
      },
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Congelamientos/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Congelamientos/ }));
    const row = `Revisar congelamiento de ${requestedFreeze.clientName}`;
    await waitFor(() => expect(screen.getByRole("button", { name: row })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: row }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Rechazar" })).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Rechazar" }));
    expect(decisions).toEqual([]);
    await waitFor(() =>
      expect(screen.getByText("¿Rechazar este congelamiento?")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Sí, rechazar" }));
    await waitFor(() => expect(decisions).toHaveLength(1));
    expect(decisions[0]).toContain("refused");
  });

  it("shows the dates, the days and where the plan end moves on their own rows", async () => {
    const screen = await openReview(requestedFreeze, "Congelamientos, 1 por revisar");

    // Walkthrough finding 52: the days were the dates row's value, crushed
    // into a one-letter column; each now has its own row.
    const dates = screen.getByText("Del lun 9 al dom 15 nov");
    expect(StyleSheet.flatten(dates.props.style)).toMatchObject({ flexShrink: 1 });
    expect(screen.getByText("7 días")).toBeOnTheScreen();
    expect(screen.getByText("Vence el vie 5 feb → vie 12 feb")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Aprobar congelamiento" })).toBeOnTheScreen();
  });

  it("names who approved it and the new plan end", async () => {
    const screen = await openReview(approvedFreeze, "Congelamientos", "Ver congelamiento de");

    expect(
      screen.getByText("Aprobada por Paola Mendoza el dom 8 nov a las 10:15"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ahora vence el vie 15 ene (antes, el dom 10 ene)")).toBeOnTheScreen();
    expect(screen.getByText("Del lun 30 nov al vie 4 dic")).toBeOnTheScreen();
    expect(screen.queryByText("Esta solicitud ya fue decidida.")).toBeNull();
  });

  it("names who refused it and keeps the plan end", async () => {
    const screen = await openReview(refusedFreeze, "Congelamientos", "Ver congelamiento de");

    expect(
      screen.getByText("Rechazada por Paola Mendoza el sáb 7 nov a las 18:40"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Vence el lun 1 mar")).toBeOnTheScreen();
  });

  it("leaves out the plan end when an older API does not send it", async () => {
    const { planEndsOn: _before, planEndsOnAfter: _after, ...older } = requestedFreeze;
    const screen = await openReview(older, "Congelamientos, 1 por revisar");

    expect(screen.getByText("7 días")).toBeOnTheScreen();
    expect(screen.queryByText(/vence/i)).toBeNull();
  });
});

import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { administratorProfile, requestedFreeze } from "./freeze-fixtures";

jest.setTimeout(30_000);

// E9 A + B (owner 2026-11-19): the review ends with «Aprobar»; «Rechazar con
// un motivo» opens the refusal step with its reason, message and notice.
const openReview = async () => {
  const decisions: unknown[] = [];
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () => jsonResponse(administratorProfile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "/api/v1/administrator/freezes": () => jsonResponse([requestedFreeze]),
    "/api/v1/administrator/freezes/decided": () => jsonResponse([]),
    [`/api/v1/administrator/freezes/${requestedFreeze.id}`]: () => jsonResponse(requestedFreeze),
    [`POST /api/v1/administrator/freezes/${requestedFreeze.id}/decision`]: (init) => {
      const body = JSON.parse(String(init?.body)) as { decision: string };
      decisions.push(body);
      return jsonResponse({ state: body.decision });
    },
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /^Congelamientos/ })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Congelamientos/ }));
  const row = `Revisar congelamiento de ${requestedFreeze.clientName}`;
  await fireEvent.press(await screen.findByRole("button", { name: row }));
  await screen.findByRole("button", { name: "Aprobar" });
  return { decisions, screen };
};

describe("reviewing and refusing a freeze", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the request as the review card and approves in one tap", async () => {
    const { decisions, screen } = await openReview();

    const card = within(screen.getByTestId("freeze-review-card"));
    expect(card.getByText("LF")).toBeOnTheScreen();
    expect(card.getByText("Lucía Fernández")).toBeOnTheScreen();
    expect(card.getByText("Pide congelar del lun 9 al dom 15 nov (7 días)")).toBeOnTheScreen();
    expect(card.getByText("Trimestral 36 clases")).toBeOnTheScreen();
    expect(card.getByText("Vencería")).toBeOnTheScreen();
    expect(card.getByText("vie 12 feb (antes vie 5 feb)")).toBeOnTheScreen();
    expect(card.getByText("Viaje de trabajo")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(decisions).toEqual([{ decision: "approved" }]));
    expect(await screen.findByText("Listo. La clienta ya fue avisada.")).toBeOnTheScreen();
  });

  it("refuses with the chosen reason and her message", async () => {
    const { decisions, screen } = await openReview();

    await fireEvent.press(screen.getByRole("button", { name: "Rechazar con un motivo" }));
    expect(await screen.findByText("Rechazar congelamiento")).toBeOnTheScreen();
    expect(screen.getByText("Lucía recibirá este motivo en su app.")).toBeOnTheScreen();
    expect(screen.getByText("Esto no se puede deshacer")).toBeOnTheScreen();
    expect(screen.getByText("Lucía podrá pedir otro congelamiento.")).toBeOnTheScreen();
    // Rosa Emma (E-D11): a white card with the soft shadow.
    expect(screen.getByTestId("refuse-freeze-notice")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    const send = screen.getByRole("button", { name: "Rechazar y avisar a Lucía" });
    expect(send).toBeDisabled();

    await fireEvent.press(screen.getByRole("radio", { name: "Faltan días de aviso" }));
    await fireEvent.changeText(
      screen.getByLabelText("Mensaje para Lucía (opcional)"),
      "Necesitamos 48 h de aviso para congelar.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Rechazar y avisar a Lucía" }));

    await waitFor(() =>
      expect(decisions).toEqual([
        {
          decision: "refused",
          refusalReason: "Faltan días de aviso. Necesitamos 48 h de aviso para congelar.",
        },
      ]),
    );
    expect(await screen.findByText("Listo. La clienta ya fue avisada.")).toBeOnTheScreen();
  });

  it("asks for her message when the reason is «Otro motivo»", async () => {
    const { decisions, screen } = await openReview();

    await fireEvent.press(screen.getByRole("button", { name: "Rechazar con un motivo" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Otro motivo" }));
    expect(screen.getByRole("button", { name: "Rechazar y avisar a Lucía" })).toBeDisabled();
    expect(screen.getByText("Escribe el motivo para Lucía.")).toBeOnTheScreen();

    // With «Otro motivo» her message is the reason, so it is no longer optional.
    await fireEvent.changeText(
      screen.getByLabelText("Mensaje para Lucía"),
      "  Tu plan ya terminó.  ",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Rechazar y avisar a Lucía" }));
    await waitFor(() =>
      expect(decisions).toEqual([{ decision: "refused", refusalReason: "Tu plan ya terminó." }]),
    );
  });

  it("goes back to the review with «Volver» without deciding", async () => {
    const { decisions, screen } = await openReview();

    await fireEvent.press(screen.getByRole("button", { name: "Rechazar con un motivo" }));
    // The back arrow is labelled «Volver» too and does the same.
    await fireEvent.press(await screen.findByTestId("refuse-freeze-back"));

    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeOnTheScreen();
    expect(screen.getByTestId("freeze-review-card")).toBeOnTheScreen();
    expect(decisions).toEqual([]);
  });
});

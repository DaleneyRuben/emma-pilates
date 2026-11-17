import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import { entry, inDays, openApp, page, routes } from "./nutritionist-test-support";

jest.setTimeout(30_000);

// Walkthrough finding 72 (FIX-056): cancelling an Evaluation whose payment
// is confirmed keeps the payment, and the Client picks another slot. The
// sheet says so; an included or unpaid one keeps the usual copy.
const openSheet = async (paymentConfirmed: boolean) => {
  const fetcher = routeFetcher(
    routes({
      "/api/v1/nutritionist/evaluations": () =>
        jsonResponse(
          page([
            {
              ...entry("evaluation-1", inDays(1), "09:00", "Lucía Fernández", "first"),
              paymentConfirmed,
            },
          ]),
        ),
    }),
  );
  const screen = await openApp(fetcher);
  await waitFor(() => expect(screen.getByText("Lucía Fernández")).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId("cancel-evaluation-evaluation-1"));
  return within(screen.getByTestId("cancel-evaluation-sheet"));
};

describe("Cancelling a paid Evaluation from the agenda", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says the confirmed payment stays and she picks another slot", async () => {
    const sheet = await openSheet(true);

    expect(
      sheet.getByText("El pago de Lucía sigue vigente; ella elige otro turno."),
    ).toBeOnTheScreen();
    expect(sheet.getByText("Le avisamos y el horario queda libre")).toBeOnTheScreen();
  });

  it("keeps the usual copy for an included or unpaid one", async () => {
    const sheet = await openSheet(false);

    expect(sheet.getByText("Le avisamos y el horario queda libre")).toBeOnTheScreen();
    expect(sheet.queryByText(/sigue vigente/)).toBeNull();
  });
});

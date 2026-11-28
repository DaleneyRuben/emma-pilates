import { act, cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { receiptBytes } from "../payments/purchase-test-support";
import { chooseReceipt, paid, uploadRoutes } from "./evaluation-receipt-test-support";
import {
  availability,
  baseRoutes,
  boliviaInstant,
  firstDay,
  openProfileRow,
  page,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

const bookedStart = () => boliviaInstant(firstDay, "09:45");

const paidAvailability = () => ({
  ...availability,
  days: availability.days.map((day) => ({
    ...day,
    slots: day.slots.map((entry) => ({ ...entry, ...paid })),
  })),
});

describe("Paid Evaluation receipt", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
  });

  it("attaches the receipt after booking and confirms the Evaluation", async () => {
    chooseReceipt();
    const attached: string[] = [];
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability()),
        ...uploadRoutes(),
        "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () =>
          jsonResponse(
            upcomingEvaluation("evaluation-paid", bookedStart(), {
              ...paid,
              paymentId: "payment-1",
            }),
            201,
          ),
        "POST /api/v1/evaluations/evaluation-paid/receipt": (init) => {
          attached.push(String(init?.body));
          return new Response(null, { status: 204 });
        },
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(
            page([
              upcomingEvaluation("evaluation-paid", bookedStart(), {
                ...paid,
                paymentId: "payment-1",
              }),
            ]),
          ),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: /^Turno .+ 09:45$/ }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    // Follow-up 264: a paid booking returns to Evaluación nutricional saying
    // the receipt went to the studio.
    await waitFor(() => {
      expect(screen.getByText("Comprobante enviado")).toBeOnTheScreen();
    });
    expect(attached).toEqual([JSON.stringify({ imageAssetId: "asset-1" })]);
  });

  it("names a second pending evaluation payment", async () => {
    chooseReceipt();
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability()),
        ...uploadRoutes(),
        "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () =>
          jsonResponse({ code: "evaluation_payment_pending", status: 409 }, 409),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    await waitFor(() => {
      expect(screen.getByText("Ya tienes un pago de evaluación pendiente.")).toBeOnTheScreen();
    });
  });

  it("keeps the booked Evaluation when attaching the receipt fails", async () => {
    chooseReceipt();
    let listed = false;
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability()),
        ...uploadRoutes(),
        "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () => {
          listed = true;
          return jsonResponse(
            upcomingEvaluation("evaluation-paid", bookedStart(), {
              ...paid,
              paymentId: "payment-1",
            }),
            201,
          );
        },
        "POST /api/v1/evaluations/evaluation-paid/receipt": () => jsonResponse({}, 409),
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(
            page(
              listed
                ? [
                    upcomingEvaluation("evaluation-paid", bookedStart(), {
                      ...paid,
                      paymentId: "payment-1",
                      receiptAttached: false,
                      receiptUploadable: true,
                    }),
                  ]
                : [],
            ),
          ),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    expect(
      await screen.findByText("Reservamos la evaluación, pero no pudimos adjuntar el comprobante."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos reservar la evaluación. Inténtalo de nuevo.")).toBeNull();
  });

  it("offers the receipt upload from a paid Evaluation that has none", async () => {
    chooseReceipt();
    const attached: string[] = [];
    const fetcher = routeFetcher(
      baseRoutes({
        ...uploadRoutes(),
        "/api/v1/evaluations?scope=upcoming": () => {
          const uploaded = attached.length > 0;
          return jsonResponse(
            page([
              upcomingEvaluation("evaluation-paid", bookedStart(), {
                ...paid,
                paymentId: "payment-1",
                receiptAttached: uploaded,
                receiptUploadable: !uploaded,
                paymentState: uploaded ? "pending" : null,
              }),
            ]),
          );
        },
        "POST /api/v1/evaluations/evaluation-paid/receipt": (init) => {
          attached.push(String(init?.body));
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await fireEvent.press(
      within(screen.getByTestId("evaluation-receipt-sheet")).getByRole("button", {
        name: "Sube tu comprobante de transferencia",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Sube tu comprobante de transferencia" }),
      ).toBeNull();
    });
    expect(attached).toEqual([JSON.stringify({ imageAssetId: "asset-1" })]);
    expect(
      await screen.findByText("El estudio revisa tu comprobante de Bs 70 y te avisa por la app."),
    ).toBeOnTheScreen();
  });

  // Board C13h (owner 2026-11-27): a rejected receipt keeps the Evaluation
  // booked; she reads the rejection and sends another one.
  it("offers another receipt after the studio rejects one", async () => {
    chooseReceipt();
    const attached: string[] = [];
    const fetcher = routeFetcher(
      baseRoutes({
        ...uploadRoutes(),
        "/api/v1/evaluations?scope=upcoming": () => {
          const uploaded = attached.length > 0;
          return jsonResponse(
            page([
              upcomingEvaluation("evaluation-paid", bookedStart(), {
                ...paid,
                paymentId: "payment-1",
                receiptAttached: true,
                receiptUploadable: !uploaded,
                paymentState: uploaded ? "pending" : "rejected",
              }),
            ]),
          );
        },
        "POST /api/v1/evaluations/evaluation-paid/receipt": (init) => {
          attached.push(String(init?.body));
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    expect(
      await screen.findByText("El estudio no aprobó tu comprobante de Bs 70."),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await fireEvent.press(
      within(screen.getByTestId("evaluation-receipt-sheet")).getByRole("button", {
        name: "Sube tu comprobante de transferencia",
      }),
    );

    await waitFor(() => {
      expect(attached).toEqual([JSON.stringify({ imageAssetId: "asset-1" })]);
    });
    expect(
      await screen.findByText("El estudio revisa tu comprobante de Bs 70 y te avisa por la app."),
    ).toBeOnTheScreen();
  });

  it("shows Subiendo and ignores a second tap while the receipt uploads", async () => {
    let releasePicker: () => void = () => {};
    const pickerHeld = new Promise<void>((resolve) => {
      releasePicker = resolve;
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementation(async () => {
      await pickerHeld;
      return {
        canceled: false,
        assets: [
          {
            uri: "file:///receipt.png",
            mimeType: "image/png",
            fileSize: receiptBytes.byteLength,
            width: 10,
            height: 10,
          },
        ],
      } as never;
    });
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
    const attached: string[] = [];
    const fetcher = routeFetcher(
      baseRoutes({
        ...uploadRoutes(),
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(
            page([
              upcomingEvaluation("evaluation-paid", bookedStart(), {
                ...paid,
                paymentId: "payment-1",
                receiptAttached: false,
                receiptUploadable: true,
              }),
            ]),
          ),
        "POST /api/v1/evaluations/evaluation-paid/receipt": (init) => {
          attached.push(String(init?.body));
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    const upload = within(screen.getByTestId("evaluation-receipt-sheet")).getByRole("button", {
      name: "Sube tu comprobante de transferencia",
    });

    await act(async () => {
      fireEvent.press(upload);
    });
    expect((await screen.findAllByText("Subiendo comprobante")).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.press(upload);
    });
    expect(attached).toEqual([]);
    releasePicker();
    await waitFor(() => {
      expect(attached).toEqual([JSON.stringify({ imageAssetId: "asset-1" })]);
    });
  });

  it("hides the receipt upload once the paid Evaluation is confirmed", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluations?scope=upcoming": () =>
          jsonResponse(
            page([
              upcomingEvaluation("evaluation-paid", bookedStart(), {
                ...paid,
                paymentId: "payment-1",
                receiptAttached: false,
                receiptUploadable: false,
              }),
            ]),
          ),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    expect(
      screen.queryByRole("button", { name: "Sube tu comprobante de transferencia" }),
    ).toBeNull();
  });

  it("names a network failure after the booking as an attach failure", async () => {
    chooseReceipt();
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability()),
        ...uploadRoutes(),
        "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () =>
          jsonResponse(
            upcomingEvaluation("evaluation-paid", bookedStart(), {
              ...paid,
              paymentId: "payment-1",
            }),
            201,
          ),
        "POST /api/v1/evaluations/evaluation-paid/receipt": () => {
          throw new Error("network");
        },
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));

    expect(
      await screen.findByText("Reservamos la evaluación, pero no pudimos adjuntar el comprobante."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos reservar la evaluación. Inténtalo de nuevo.")).toBeNull();
  });
});

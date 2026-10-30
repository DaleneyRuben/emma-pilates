import { act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { receiptBytes } from "../payments/purchase-test-support";
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

const paid = { included: false, priceCentavos: 7_000 };
const bookedStart = () => boliviaInstant(firstDay, "09:45");

const paidAvailability = () => ({
  ...availability,
  days: availability.days.map((day) => ({
    ...day,
    slots: day.slots.map((entry) => ({ ...entry, ...paid })),
  })),
});

function chooseReceipt() {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
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
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
}

function uploadRoutes() {
  let statusReads = 0;
  return {
    "POST /api/v1/uploads": () =>
      jsonResponse(
        {
          id: "asset-1",
          uploadUrl: "/api/v1/uploads/asset-1/object",
          expiresAt: "2026-09-21T15:15:00.000Z",
        },
        201,
      ),
    "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
    "POST /api/v1/uploads/asset-1/finalize": () =>
      jsonResponse({ id: "asset-1", state: "processing" }, 202),
    "/api/v1/uploads/asset-1": () => {
      statusReads += 1;
      return jsonResponse({
        id: "asset-1",
        state: statusReads < 2 ? "processing" : "ready",
        mediaType: "image/jpeg",
      });
    },
  };
}

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
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(screen.getByText("Evaluación confirmada")).toBeOnTheScreen();
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
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

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
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

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
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Sube tu comprobante de transferencia" }),
      ).toBeNull();
    });
    expect(attached).toEqual([JSON.stringify({ imageAssetId: "asset-1" })]);
    expect(screen.getByText("Comprobante listo.")).toBeOnTheScreen();
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
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");
    const upload = await screen.findByRole("button", {
      name: "Sube tu comprobante de transferencia",
    });

    await act(async () => {
      fireEvent.press(upload);
    });
    expect(await screen.findByText("Subiendo comprobante…")).toBeOnTheScreen();

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
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

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
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText("Reservamos la evaluación, pero no pudimos adjuntar el comprobante."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos reservar la evaluación. Inténtalo de nuevo.")).toBeNull();
  });
});

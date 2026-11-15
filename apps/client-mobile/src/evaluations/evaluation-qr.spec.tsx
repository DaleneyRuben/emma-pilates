import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { chooseReceipt, paid, qrRoute, uploadRoutes } from "./evaluation-receipt-test-support";
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

const paidAvailability = () => ({
  ...availability,
  days: availability.days.map((day) => ({
    ...day,
    slots: day.slots.map((entry) => ({ ...entry, ...paid })),
  })),
});

const pendingReceipt = () =>
  upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:45"), {
    ...paid,
    paymentId: "payment-1",
    receiptAttached: false,
    receiptUploadable: true,
  });

// Verification finding 63, design follow-up 262: C14b and C15c.
describe("The studio QR on a paid Evaluation", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
  });

  it("shows the QR before the receipt on a paid Confirma tu cita", async () => {
    chooseReceipt();
    const fetcher = routeFetcher(
      baseRoutes({
        "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability()),
        ...qrRoute,
        ...uploadRoutes(),
      }),
    );
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));

    expect(await screen.findByText("Cuesta Bs 70 · se paga por transferencia")).toBeOnTheScreen();
    expect(screen.getByText("1 · Paga con el QR del estudio")).toBeOnTheScreen();
    expect(screen.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    expect(screen.getByText("Escanéalo con tu app bancaria y transfiere Bs 70.")).toBeOnTheScreen();
    expect(await screen.findByLabelText("Código QR del estudio")).toBeOnTheScreen();
    expect(screen.getByText("Adjunta tu comprobante para continuar")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeDisabled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });
    expect(screen.getByText("El estudio revisa tu pago y te avisa por la app")).toBeOnTheScreen();
  });

  it("keeps the free Confirma tu cita without a QR", async () => {
    const screen = await openProfileRow(
      routeFetcher(baseRoutes({ ...qrRoute })),
      "Evaluación nutricional",
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));

    expect(await screen.findByText("Es gratis: no usa clases de tu plan")).toBeOnTheScreen();
    expect(screen.queryByText("1 · Paga con el QR del estudio")).toBeNull();
    expect(screen.queryByLabelText("Código QR del estudio")).toBeNull();
  });

  it("opens the QR and the receipt in a sheet from Mis evaluaciones", async () => {
    const fetcher = routeFetcher(
      baseRoutes({
        ...qrRoute,
        "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([pendingReceipt()])),
      }),
    );
    const screen = await openProfileRow(fetcher, "Mis evaluaciones");

    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );

    const sheet = within(screen.getByTestId("evaluation-receipt-sheet"));
    expect(sheet.getByText("Sube tu comprobante")).toBeOnTheScreen();
    expect(sheet.getByText("1 · Paga con el QR del estudio")).toBeOnTheScreen();
    expect(sheet.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    expect(sheet.getByText("Escanéalo con tu app bancaria y transfiere Bs 70.")).toBeOnTheScreen();
    expect(await sheet.findByLabelText("Código QR del estudio")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Volver" }));

    expect(screen.queryByTestId("evaluation-receipt-sheet")).toBeNull();
    expect(jest.mocked(ImagePicker.launchImageLibraryAsync)).not.toHaveBeenCalled();
  });
});

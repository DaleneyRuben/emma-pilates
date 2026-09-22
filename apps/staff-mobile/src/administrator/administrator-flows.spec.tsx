import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import {
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
} from "@pilates/mobile-core";

import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactTestInstance } from "react-test-renderer";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const isInsideSafeArea = (element: ReactTestInstance): boolean => {
  let current: ReactTestInstance | null = element.parent;
  while (current !== null) {
    if (current.type === SafeAreaView) return true;
    current = current.parent;
  }
  return false;
};

const administrator = {
  id: "staff-2",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

const minute = 60_000;
const hour = 60 * minute;
const yesterdayAt1940 = `${boliviaCivilDate(new Date(Date.now() - 24 * hour))}T23:40:00.000Z`;
const twentyMinutesAgo = new Date(Date.now() - 20 * minute).toISOString();

const carla = {
  id: "payment-1",
  clientName: "Carla Mendoza",
  planName: "Paquete de 8 clases",
  amountDueCentavos: 56_000,
  submittedAt: yesterdayAt1940,
  receiptAvailable: true,
};
const andrea = {
  id: "payment-2",
  clientName: "Andrea Roca",
  planName: "Paquete de 12 clases",
  amountDueCentavos: 78_000,
  submittedAt: twentyMinutesAgo,
  receiptAvailable: true,
};

const review = (payment: typeof carla, state = "pending") => ({
  id: payment.id,
  method: "transfer",
  state,
  planId: "plan-1",
  planName: payment.planName,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: payment.amountDueCentavos,
  creditAppliedCentavos: 0,
  amountDueCentavos: payment.amountDueCentavos,
  submittedAt: payment.submittedAt,
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: payment.clientName,
  receipt: { imageAssetId: "asset-1", mediaType: "image/png" },
  receiptUrl: `/api/v1/administrator/payments/${payment.id}/receipt`,
});

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const receiptResponse = () =>
  new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 });

const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const startsAt = new Date(Date.now() + 3 * hour);
const session = {
  id: "session-1",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};

function administratorRoutes(pending: () => unknown[]) {
  return {
    "/api/v1/staff-members/current": () => jsonResponse(administrator),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse(pending()),
    "/api/v1/administrator/payments/payment-1": () => jsonResponse(review(carla)),
    "/api/v1/administrator/payments/payment-2": () => jsonResponse(review(andrea)),
    "/api/v1/administrator/payments/payment-1/receipt": receiptResponse,
    "/api/v1/administrator/payments/payment-2/receipt": receiptResponse,
    "/api/v1/branches": () =>
      jsonResponse([
        { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
        { id: "branch-urubo", name: "Urubó", address: "Condominio Los Tajibos" },
      ]),
    "/api/v1/class-types": () =>
      jsonResponse([
        {
          id: "class-reformer",
          name: "Reformer Pilates",
          description: "",
          durationMinutes: 50,
        },
        { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
      ]),
  };
}

async function openPendingPayments(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "administrator")} />,
  );
  await waitFor(
    () => {
      expect(screen.getByLabelText("Pagos pendientes")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return screen;
}

describe("Administrator payments and Session cancellation", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("lists pending transfers, reviews one with its receipt, and confirms it", async () => {
    let pending = [carla, andrea];
    const confirmed = jest.fn();
    const screen = await openPendingPayments({
      ...administratorRoutes(() => pending),
      "POST /api/v1/administrator/payments/payment-1/confirm": () => {
        confirmed();
        pending = [andrea];
        return jsonResponse({ ...review(carla, "confirmed"), decidedAt: twentyMinutesAgo }, 201);
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Carla Mendoza")).toBeOnTheScreen();
    });
    expect(screen.getByText("Por confirmar")).toBeOnTheScreen();
    expect(screen.getByText("Bs 1.340 en total")).toBeOnTheScreen();
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Ayer, 19:40")).toBeOnTheScreen();
    expect(screen.getByText("Andrea Roca")).toBeOnTheScreen();
    expect(screen.getByText("Hace 20 minutos")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Revisar pago de Carla Mendoza" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Monto a verificar")).toBeOnTheScreen();
    });
    expect(screen.getByText("Carla Mendoza")).toBeOnTheScreen();
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Pendiente")).toBeOnTheScreen();
    expect(screen.getByText(/^Transferencia · enviado el \d+ de \w+, 19:40$/)).toBeOnTheScreen();
    expect(screen.getByText("Comprobante")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByLabelText("Comprobante de transferencia")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Ampliar" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Comprobante ampliado")).toBeOnTheScreen();
    });
    expect(
      isInsideSafeArea(screen.getByRole("button", { name: "Cerrar" })),
    ).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("Comprobante ampliado")).not.toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago" }));

    await waitFor(() => {
      expect(confirmed).toHaveBeenCalled();
      expect(screen.getByText("Pago confirmado")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.queryByText("Carla Mendoza")).not.toBeOnTheScreen();
    });
    expect(screen.getByText("Andrea Roca")).toBeOnTheScreen();
    expect(screen.getByText("Bs 780 en total")).toBeOnTheScreen();
  });

  it("requires a reason to reject and shows the calm empty state afterwards", async () => {
    let pending = [andrea];
    const rejected = jest.fn();
    const screen = await openPendingPayments({
      ...administratorRoutes(() => pending),
      "POST /api/v1/administrator/payments/payment-2/reject": (init) => {
        rejected(JSON.parse(String(init?.body)));
        pending = [];
        return jsonResponse(
          {
            ...review(andrea, "rejected"),
            decidedAt: twentyMinutesAgo,
            rejectionReason: "El monto no coincide con la transferencia recibida.",
          },
          201,
        );
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Andrea Roca")).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Revisar pago de Andrea Roca" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Monto a verificar")).toBeOnTheScreen();
    });

    expect(screen.queryByText("Motivo del rechazo")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Rechazar" }));
    expect(screen.getByText("Motivo del rechazo")).toBeOnTheScreen();
    expect(
      screen.getByText("La clienta verá este mensaje para corregir y volver a enviar."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirmar rechazo" })).toHaveProp(
      "accessibilityState",
      { disabled: true },
    );

    await fireEvent.changeText(
      screen.getByLabelText("Motivo del rechazo"),
      "El monto no coincide con la transferencia recibida.",
    );
    expect(screen.getByRole("button", { name: "Confirmar rechazo" })).toHaveProp(
      "accessibilityState",
      { disabled: false },
    );
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar rechazo" }));

    await waitFor(() => {
      expect(rejected).toHaveBeenCalledWith({
        reason: "El monto no coincide con la transferencia recibida.",
      });
      expect(screen.getByText("Pago rechazado")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByText("No hay pagos pendientes.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Todo al día. Te avisaremos cuando llegue una transferencia nueva.",
      ),
    ).toBeOnTheScreen();
  });

  it("finds a Session by Branch, day, and Class Type and cancels it with a receipt of the consequences", async () => {
    const cancelled = jest.fn();
    let sessions = [session];
    const screen = await openPendingPayments({
      ...administratorRoutes(() => []),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse(sessions),
      "POST /api/v1/administrator/sessions/session-1/cancel": () => {
        cancelled();
        sessions = [];
        return jsonResponse({ affectedBookings: 6 }, 201);
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Cancelar una clase" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Cancelar una clase")).toBeOnTheScreen();
    });
    expect(screen.getByText("Centro")).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("Emma Vargas")).toBeOnTheScreen();
    expect(screen.getByText("6 reservas")).toBeOnTheScreen();
    expect(screen.getByText("6 cupos")).toBeOnTheScreen();
    expect(screen.getByText("1 clase")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Mat Pilates" }));
    await waitFor(() => {
      expect(screen.getByText("No hay clases con estos filtros.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Prueba otro día, otra sucursal u otro tipo de clase."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Todas" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
      ).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() => {
      expect(screen.getByLabelText("Cancelar sesión")).toBeOnTheScreen();
    });
    expect(screen.getByText("6 clientes afectados")).toBeOnTheScreen();
    expect(screen.getByText("Esto no se puede deshacer")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar sesión" }));
    await waitFor(() => {
      expect(cancelled).toHaveBeenCalled();
      expect(screen.getByText("Sesión cancelada")).toBeOnTheScreen();
    });
    expect(screen.getByText("Se notificó a los 6 clientes afectados.")).toBeOnTheScreen();
    expect(screen.getByText("Se reembolsó una clase a cada cliente.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByText("No hay clases con estos filtros.")).toBeOnTheScreen();
    });
  });
});

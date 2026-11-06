import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const photo = (id: string) => ({ imageAssetId: id });
const image = () =>
  new Response(new Uint8Array([255, 216, 255, 224]), {
    headers: { "Content-Type": "image/jpeg" },
    status: 200,
  });
const staff = (role: string, name: string) => ({
  id: `staff-${role}`,
  name,
  email: `${role}@example.com`,
  phone: null,
  role,
  branches: [],
});
const common = {
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/client-photos/asset-ana?variant=thumbnail": image,
  "/api/v1/client-photos/asset-ana?variant=display": image,
};

// Finding n.º 30 (owner, 2026-11-05): wherever the staff see a Client, her
// photo when she has one, her initials otherwise.
describe("Client faces on the staff screens", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts each Client's face on the Trainer's class roster", async () => {
    const session = {
      bookedCount: 2,
      branchName: "Centro",
      capacity: 8,
      classTypeName: "Reformer Pilates",
      endsAt: "2099-09-10T11:00:00.000Z",
      sessionId: "session-1",
      startsAt: "2099-09-10T10:00:00.000Z",
    };
    const fetcher = routeFetcher({
      ...common,
      "/api/v1/staff-members/current": () => jsonResponse(staff("trainer", "Emma Vargas")),
      "/api/v1/trainer/sessions": () => jsonResponse([session]),
      "/api/v1/trainer/sessions/session-1/roster": () =>
        jsonResponse({
          ...session,
          bookings: [
            { bookingId: "booking-1", clientName: "Ana Pérez", clientPhoto: photo("asset-ana") },
            { bookingId: "booking-2", clientName: "Luis Flores", clientPhoto: null },
          ],
        }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
    await waitFor(() => expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("Foto de Ana Pérez")).toHaveStyle({ width: 36, height: 36 }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/v1/client-photos/asset-ana?variant=thumbnail");
    expect(screen.getByText("LF")).toBeOnTheScreen();
  });

  it("puts her face on Pagos pendientes and on Revisar pago", async () => {
    const payment = (id: string, clientName: string, clientPhoto: unknown) => ({
      id,
      clientName,
      clientPhoto,
      planName: "Paquete de 8 clases",
      amountDueCentavos: 56_000,
      submittedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      receiptAvailable: false,
    });
    const ana = payment("payment-1", "Ana Pérez", photo("asset-ana"));
    const fetcher = routeFetcher({
      ...common,
      "/api/v1/staff-members/current": () => jsonResponse(staff("administrator", "Paola Mendoza")),
      "/api/v1/administrator/payments/pending": () =>
        jsonResponse([ana, payment("payment-2", "Luis Flores", null)]),
      "/api/v1/administrator/payments/payment-1": () =>
        jsonResponse({
          ...ana,
          method: "cash",
          state: "pending",
          planId: "plan-1",
          durationDays: 30,
          durationMonths: 1,
          classAllowance: 8,
          planPriceCentavos: 56_000,
          creditAppliedCentavos: 0,
          decidedAt: null,
          rejectionReason: null,
          subscriptionId: null,
          receipt: null,
          receiptUrl: null,
        }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);

    const row = await screen.findByTestId("pending-payment-payment-1");
    await waitFor(() =>
      expect(within(row).getByLabelText("Foto de Ana Pérez")).toHaveStyle({ width: 36 }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/v1/client-photos/asset-ana?variant=thumbnail");
    expect(
      within(screen.getByTestId("pending-payment-payment-2")).getByText("LF"),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Revisar pago de Ana Pérez" }));
    await waitFor(() => expect(screen.getByText("Monto a verificar")).toBeOnTheScreen());
    await waitFor(() => expect(screen.getByLabelText("Foto de Ana Pérez")).toBeOnTheScreen());
  });

  it("puts her face on the Coordinator's Para contactar", async () => {
    const alert = (clientId: string, name: string, clientPhoto: unknown) => ({
      clientId,
      name,
      phone: null,
      photo: clientPhoto,
      startedOn: "2026-10-02",
      reasons: ["no_booking_7_days"],
    });
    const fetcher = routeFetcher({
      ...common,
      "/api/v1/staff-members/current": () => jsonResponse(staff("coordinator", "Carolina Rivas")),
      "/api/v1/administrator/contact-alerts": () =>
        jsonResponse({
          items: [
            alert("client-ana", "Ana Pérez", photo("asset-ana")),
            alert("client-luis", "Luis Flores", null),
          ],
          totalItems: 2,
        }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "coordinator")} />);
    await waitFor(() => expect(screen.getByTestId("tab-contacts")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-contacts"));

    await waitFor(() =>
      expect(screen.getByLabelText("Foto de Ana Pérez")).toHaveStyle({ width: 36 }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/v1/client-photos/asset-ana?variant=thumbnail");
    expect(screen.getByText("LF")).toBeOnTheScreen();
  });
});

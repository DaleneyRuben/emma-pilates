import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

// «Mis pagos» fixtures and the walk from the agenda to S29, shared by its specs.
export const trainerProfile = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

export const approvedOctober = {
  id: "statement-october",
  staffMemberId: "staff-1",
  staffMemberName: "Emma Vargas",
  month: "2026-10-01",
  state: "approved",
  totalCentavos: 32_200,
  salaryPaymentId: "payment-october",
  lines: [
    { kind: "class", detail: "3 alumnas", amountCentavos: 6_500 },
    { kind: "class", detail: "6 alumnas, 2 extra", amountCentavos: 8_100 },
    { kind: "minimum_not_met", detail: "Mínimo no alcanzado", amountCentavos: 2_500 },
    { kind: "commission", detail: "Primer plan", amountCentavos: 7_850 },
  ],
};

export const draftNovember = {
  ...approvedOctober,
  id: "statement-november",
  month: "2026-11-01",
  state: "draft",
  totalCentavos: 6_500,
  salaryPaymentId: null,
  lines: [{ kind: "class", detail: "4 alumnas", amountCentavos: 6_500 }],
};

export type PayRoutes = {
  statements?: () => Response;
  payments?: () => Response;
  extra?: Record<string, () => Response>;
};

export function staffRoutes(profile: unknown, pay: PayRoutes = {}) {
  return {
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/trainer/pay-statements":
      pay.statements ?? (() => jsonResponse([draftNovember, approvedOctober])),
    "/api/v1/trainer/salary-payments":
      pay.payments ??
      (() =>
        jsonResponse([
          { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl: null },
        ])),
    ...pay.extra,
  };
}

export async function openMyPay(pay: PayRoutes = {}) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(staffRoutes(trainerProfile, pay)))} />,
  );
  // v2: Mis pagos is the Trainer's second tab (follow-up 225 §8).
  await waitFor(() => expect(screen.getByTestId("tab-pay")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-pay"));
  return screen;
}

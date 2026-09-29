export type ClosureInputs = {
  availableCreditCentavos: number;
  bookings: { kind: "booking" | "waitlist" }[];
  evaluations: { state: "booked" | "cancelled" }[];
  latestPayment: { method: string; state: string } | null;
  subscription: {
    status: "active" | "expiring_soon" | "expired" | "none";
    subscription?: { planName: string; remainingClassAllowance: number } | null;
  };
};

export const describeAccountClosure = (
  _inputs: ClosureInputs,
): { blocked: boolean; lines: string[] } => ({ blocked: false, lines: [] });

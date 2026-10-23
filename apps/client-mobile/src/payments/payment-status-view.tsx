import { Text } from "react-native";

export type PaymentStatusState = "pending" | "confirmed" | "rejected";

export function PaymentStatusView({ state }: { state: PaymentStatusState }) {
  return <Text>{state}</Text>;
}

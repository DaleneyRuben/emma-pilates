import { useGetOwnPayoutQr } from "@pilates/api-contracts";

import { useStaffFetcher } from "../../staff-fetcher";
import { ProfileRow } from "../profile-row";
import { payoutQrRowValue } from "./payout-qr-copy";

/**
 * FIX-072: the payout QR with its standing, in Perfil for every role («Tu QR
 * de cobro», follow-up 293) and, since E8, last on the «Mis pagos» tab («Mi
 * QR de cobro», E-M01).
 */
export function PayoutQrRow({
  label = "Tu QR de cobro",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  const fetcher = useStaffFetcher();
  const payoutQr = useGetOwnPayoutQr({ fetcher, query: { refetchOnMount: "always" } });
  const value =
    payoutQr.data?.status === 200 ? payoutQrRowValue(payoutQr.data.data.payoutQr) : undefined;
  return (
    <ProfileRow
      icon="image"
      label={label}
      onPress={onPress}
      testID="profile-payout-qr"
      value={value?.text}
      valueTone={value?.tone}
    />
  );
}

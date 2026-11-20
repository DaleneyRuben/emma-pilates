import { useGetOwnPayoutQr } from "@pilates/api-contracts";

import { useStaffFetcher } from "../../staff-fetcher";
import { ProfileRow } from "../profile-row";
import { payoutQrRowValue } from "./payout-qr-copy";

/**
 * FIX-072: «Mi QR de cobro» with its standing, in Perfil for every role and,
 * since E8, last on the «Mis pagos» tab.
 */
export function PayoutQrRow({ onPress }: { onPress: () => void }) {
  const fetcher = useStaffFetcher();
  const payoutQr = useGetOwnPayoutQr({ fetcher, query: { refetchOnMount: "always" } });
  const value =
    payoutQr.data?.status === 200 ? payoutQrRowValue(payoutQr.data.data.payoutQr) : undefined;
  return (
    <ProfileRow
      icon="image"
      label="Mi QR de cobro"
      onPress={onPress}
      testID="profile-payout-qr"
      value={value?.text}
      valueTone={value?.tone}
    />
  );
}

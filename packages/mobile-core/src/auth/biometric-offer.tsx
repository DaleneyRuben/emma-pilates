import { useContext, useState } from "react";
import { useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { BiometricOfferSheet } from "../ui/biometric-offer-sheet";
import { BrandToast } from "../ui/brand-toast";
import { tabBarStyleFor } from "../ui/tab-bar";
import { spacing } from "../ui/tokens";
import { useTransientNotice } from "../ui/transient-notice";
import { biometricCopy } from "./biometric-copy";
import { useMobileIdentity } from "./identity-provider";

const noticeMs = 5_000;

/**
 * Drawn over the navigators: the offer after a password sign-in, and the
 * toast that confirms biometrics were turned on (here or from Perfil), which
 * floats over the tab bar.
 */
export function BiometricOffer() {
  const { biometrics } = useMobileIdentity();
  const [busy, setBusy] = useState(false);
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const { fontScale } = useWindowDimensions();
  const notice = useTransientNotice(
    biometrics.enabledNotice ? biometricCopy().enabledToast : undefined,
    noticeMs,
    biometrics.dismissEnabledNotice,
  );
  const enable = async () => {
    setBusy(true);
    try {
      await biometrics.enable();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BiometricOfferSheet
        busy={busy}
        onDismiss={() => void biometrics.dismissOffer()}
        onEnable={() => void enable()}
        visible={biometrics.offer}
      />
      {notice === null ? null : (
        <BrandToast
          onClose={biometrics.dismissEnabledNotice}
          style={{
            bottom: tabBarStyleFor({ bottom: bottomInset }, fontScale).height + spacing.lg,
          }}
          testID="biometric-enabled-toast"
          title={notice}
        />
      )}
    </>
  );
}

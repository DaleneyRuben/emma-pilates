import { useEffect, useEffectEvent, useState } from "react";

import { ConfirmationSheet } from "../ui/confirmation-sheet";
import type { AuthenticationApi } from "./authentication-api";

const codePattern = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

type Offer = { code: string; holderFirstName: string; trainer: boolean };

/**
 * Walkthrough n.º 13 (C01b8): on an iPhone the invite page copied the code
 * before opening the App Store. «Crea tu cuenta» asks once for the clipboard
 * (the app passes `read` only there) and, if it holds a friend's live code,
 * offers it. Anything else, or a failed read, offers nothing.
 */
export function useClipboardInvite(
  api: Pick<AuthenticationApi, "lookUpReferralCode">,
  read: (() => Promise<string | null>) | undefined,
): { offer: Offer | null; dismiss: () => void } {
  const [offer, setOffer] = useState<Offer | null>(null);
  const readOnce = useEffectEvent(() => read);

  useEffect(() => {
    const reader = readOnce();
    if (reader === undefined) return undefined;
    let active = true;
    void Promise.resolve()
      .then(reader)
      .then(async (text) => {
        const code = (text ?? "").trim().toUpperCase();
        if (!codePattern.test(code)) return;
        const found = await api.lookUpReferralCode(code);
        if (
          active &&
          found.status === "valid" &&
          (found.holderKind === "client" || found.holderKind === "trainer") &&
          typeof found.holderFirstName === "string"
        ) {
          setOffer({
            code: found.code,
            holderFirstName: found.holderFirstName,
            // #26: a Trainer's code attributes her client, with no free class.
            trainer: found.holderKind === "trainer",
          });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api]);

  return { offer, dismiss: () => setOffer(null) };
}

export function ClipboardInviteSheet({
  offer,
  onDismiss,
  onUse,
}: {
  offer: Offer | null;
  onDismiss: () => void;
  onUse: (code: string) => void;
}) {
  return (
    <ConfirmationSheet
      confirmLabel={offer === null ? "" : `Usar código ${offer.code}`}
      dismissLabel="No, gracias"
      note={
        offer?.trainer === true
          ? "Usa su código al crear tu cuenta."
          : "Usa su código y tu primera clase es gratis."
      }
      onConfirm={() => {
        if (offer !== null) onUse(offer.code);
      }}
      onDismiss={onDismiss}
      title={offer === null ? "" : `¿Te invitó ${offer.holderFirstName}?`}
      tone="primary"
      visible={offer !== null}
    />
  );
}

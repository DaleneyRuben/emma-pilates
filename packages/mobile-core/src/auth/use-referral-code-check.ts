import { useEffect, useState } from "react";

import type { AuthenticationApi } from "./authentication-api";

export type ReferralCodeCheck =
  | { status: "idle" }
  | { status: "valid"; holderFirstName: string; holderKind: "client" | "trainer" }
  | { status: "unknown"; code: string };

const debounceMilliseconds = 400;
// One object, so a caller can tell a new answer from the same one.
const idle: ReferralCodeCheck = { status: "idle" };

/**
 * Walkthrough n.º 18 (C01b5, C01b6): a typed referral code is looked up a
 * moment after she stops typing, so «Crea tu cuenta» can name whose it is or
 * flag it before the Account exists. A failed lookup says nothing: the
 * server still checks the code on registering.
 */
export function useReferralCodeCheck(
  api: Pick<AuthenticationApi, "lookUpReferralCode">,
  typed: string,
): ReferralCodeCheck {
  const code = typed.trim();
  const [checked, setChecked] = useState<{ code: string; check: ReferralCodeCheck }>({
    code: "",
    check: idle,
  });

  useEffect(() => {
    if (code === "") return undefined;
    let active = true;
    const timer = setTimeout(() => {
      void Promise.resolve()
        .then(() => api.lookUpReferralCode(code))
        .then((result) => {
          if (!active) return;
          setChecked({
            code,
            check:
              result.status === "valid" &&
              typeof result.holderFirstName === "string" &&
              (result.holderKind === "client" || result.holderKind === "trainer")
                ? {
                    status: "valid",
                    holderFirstName: result.holderFirstName,
                    holderKind: result.holderKind,
                  }
                : { status: "unknown", code: result.code },
          });
        })
        .catch(() => undefined);
    }, debounceMilliseconds);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, code]);

  // An answer for an earlier text no longer applies.
  return checked.code === code && code !== "" ? checked.check : idle;
}

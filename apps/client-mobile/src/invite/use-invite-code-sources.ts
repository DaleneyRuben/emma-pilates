import { deviceStorage } from "@pilates/mobile-core";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { clipboardCodeReader, readInstallReferrerCode } from "./invite-code-sources";

// The native module is loaded only when asked, so a build without it (older
// than 1.3.0, reached by an update) answers nothing instead of failing.
const loadApplication = () => import("expo-application");

const readClipboardCode = clipboardCodeReader({
  clipboard: Clipboard,
  os: Platform.OS,
  storage: deviceStorage,
});

/** The friend's code a new install brought with it (walkthrough n.º 13). */
export function useInviteCodeSources(): {
  readClipboardCode: (() => Promise<string | null>) | undefined;
  suggestedReferralCode: string | null;
} {
  const [suggestedReferralCode, setSuggested] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void readInstallReferrerCode({
      load: loadApplication,
      os: Platform.OS,
      storage: deviceStorage,
    }).then((code) => {
      if (active) setSuggested(code);
    });
    return () => {
      active = false;
    };
  }, []);

  return { readClipboardCode, suggestedReferralCode };
}

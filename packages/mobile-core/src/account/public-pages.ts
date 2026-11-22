import { Linking } from "react-native";

// The studio's public pages (WEB-021, apps/public-site), the same for every
// app variant. App Review 5.1.1(i) wants the privacy policy reachable from
// inside the app, so both Perfil screens open these.
export const publicPageUrls = {
  support: "https://app.emmapilatesstudio.com/soporte",
  privacy: "https://app.emmapilatesstudio.com/privacidad",
} as const;

export type PublicPage = keyof typeof publicPageUrls;

/** Opens a public page in the system browser; a refusal is not an error here. */
export function openPublicPage(page: PublicPage): void {
  Linking.openURL(publicPageUrls[page]).catch(() => undefined);
}

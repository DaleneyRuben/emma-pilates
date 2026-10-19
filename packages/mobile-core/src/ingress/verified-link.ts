export type LinkIdentityKind = "client" | "staff";

export type AuthenticationLinkIntent = {
  type: "verify-email" | "activate-account" | "recover-password" | "confirm-email-change";
  token: string;
};

const authenticationPaths: Readonly<Record<string, AuthenticationLinkIntent["type"]>> = {
  "authentication/verify-email": "verify-email",
  "authentication/activate-account": "activate-account",
  "authentication/recover-password": "recover-password",
  // IDN-008: the link sent to a new address confirms the email change.
  "authentication/confirm-email-change": "confirm-email-change",
};

export function parseVerifiedLink(
  value: string,
  allowedHosts: readonly string[],
  identityKind: LinkIdentityKind,
): AuthenticationLinkIntent | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  // ADR-0095: each app claims only its own Accounts' prefix.
  const prefix = `/${identityKind}/`;
  const type = url.pathname.startsWith(prefix)
    ? authenticationPaths[url.pathname.slice(prefix.length)]
    : undefined;
  const token = url.searchParams.get("token");

  if (
    url.protocol !== "https:" ||
    !allowedHosts.includes(url.hostname) ||
    type === undefined ||
    token === null ||
    token.trim() === ""
  ) {
    return null;
  }

  return { type, token };
}

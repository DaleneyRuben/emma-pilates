export type LinkIdentityKind = "client" | "staff";

export type AuthenticationLinkIntent = {
  type:
    | "verify-email"
    | "activate-account"
    | "recover-password"
    | "confirm-email-change"
    // Walkthrough n.º 13: a friend's invite; `token` holds her code.
    | "referral-invite";
  token: string;
};

const invitePrefix = "/client/invite/";
const inviteCode = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

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

  // Walkthrough n.º 13: only the Client app opens an invite, by its code.
  if (
    identityKind === "client" &&
    url.protocol === "https:" &&
    allowedHosts.includes(url.hostname) &&
    url.pathname.startsWith(invitePrefix)
  ) {
    const code = decodeURIComponent(url.pathname.slice(invitePrefix.length)).toUpperCase();
    return inviteCode.test(code) ? { type: "referral-invite", token: code } : null;
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

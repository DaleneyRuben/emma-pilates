export type AuthenticationLinkIntent = {
  type: "verify-email" | "activate-account" | "recover-password";
  token: string;
};

const authenticationPaths: Readonly<
  Record<string, AuthenticationLinkIntent["type"]>
> = {
  "/authentication/verify-email": "verify-email",
  "/authentication/activate-account": "activate-account",
  "/authentication/recover-password": "recover-password",
};

export function parseVerifiedLink(
  value: string,
  allowedHosts: readonly string[],
): AuthenticationLinkIntent | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const type = authenticationPaths[url.pathname];
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

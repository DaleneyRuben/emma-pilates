/**
 * The invite link a Client or a Trainer shares (walkthrough n.º 13, 26): it
 * opens the Client app's registration with the code, or the stores.
 */
export const referralInviteLink = (code: string): string =>
  `https://links.emmapilatesstudio.com/client/invite/${encodeURIComponent(code)}`;

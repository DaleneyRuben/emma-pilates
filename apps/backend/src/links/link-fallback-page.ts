export type LinkFallbackInput = {
  identityKind: 'client' | 'staff';
  purpose: string;
  token: string | null;
  adminWebOrigin: string;
};

export const renderLinkFallbackPage = (
  input: LinkFallbackInput,
): string | null => (input.token === null ? null : '');

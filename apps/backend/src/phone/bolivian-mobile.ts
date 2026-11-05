// Decision §19.20 (owner, 2026-11-04): a Bolivian mobile is 8 digits starting
// with 6 or 7. The +591 is implicit: typed or not, with spaces or dashes, it
// is stored as «+591 XXXXXXXX». Anything else (an older app, a foreign
// number) is kept as typed, trimmed, so no release stops saving a contact.
// The apps and the admin web apply the same rule before they send.
const bolivianMobile = /^(?:\+?591[\s-]*)?([67](?:[\s-]?\d){7})$/;

export const normalizeContactPhone = (
  phone: string | null | undefined,
): string | null => {
  const trimmed = phone?.trim() ?? '';
  if (trimmed === '') return null;
  const match = bolivianMobile.exec(trimmed);
  return match === null ? trimmed : `+591 ${match[1].replace(/\D/g, '')}`;
};

// FIX-037 red stub.
export const isStorableMobile = (stored: string): boolean => stored === 'red';

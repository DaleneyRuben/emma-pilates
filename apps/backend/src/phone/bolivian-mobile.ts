// Decision §19.20 (owner, 2026-11-04): a Bolivian mobile is 8 digits starting
// with 6 or 7. The +591 is implicit: typed or not, with spaces or dashes, it
// is stored as «+591 XXXXXXXX». FIX-037 (DES-006): a number from another
// country, typed with its code, is stored as «+<code> <digits>». Anything else
// (an older app) is kept as typed, trimmed, so no release stops saving a
// contact. The apps (`mobile-core`'s `phone-number.ts`) and the admin web
// check each country's mobiles before they send.
const bolivianMobile = /^(?:\+?591[\s-]*)?([67](?:[\s-]?\d){7})$/;
const foreignMobile = /^\+(\d{1,3})[\s-]+((?:\d[\s-]?){6,14})$/;
const storedBolivianMobile = /^\+591 [67]\d{7}$/;
const storedForeignMobile = /^\+(\d{1,3}) \d{6,14}$/;

export const normalizeContactPhone = (
  phone: string | null | undefined,
): string | null => {
  const trimmed = phone?.trim() ?? '';
  if (trimmed === '') return null;
  const match = bolivianMobile.exec(trimmed);
  if (match !== null) return `+591 ${match[1].replace(/\D/g, '')}`;
  const foreign = foreignMobile.exec(trimmed);
  return foreign === null || foreign[1] === '591'
    ? trimmed
    : `+${foreign[1]} ${foreign[2].replace(/\D/g, '')}`;
};

/** A normalized phone that is a mobile with its country code (FIX-037). */
export const isStorableMobile = (stored: string): boolean => {
  if (storedBolivianMobile.test(stored)) return true;
  const code = storedForeignMobile.exec(stored)?.[1];
  return code !== undefined && code !== '591';
};

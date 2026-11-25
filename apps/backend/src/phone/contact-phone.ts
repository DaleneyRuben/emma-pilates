// A contact phone, checked with Google's libphonenumber metadata ("max"), so
// no digit, length or prefix rule is kept by hand. A mobile is stored as
// «+<code> <national digits>» (FIX-036, FIX-037), e.g. «+591 71234567»; a
// Bolivian one may be typed without +591. Anything else (an older app) is
// kept as typed, trimmed, so no release stops saving a contact. The apps and
// the admin web read the same metadata through `@pilates/phone-number`.
import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from 'libphonenumber-js/max';

// A US or Canadian number can be either, so it counts as a mobile.
const mobileTypes: ReadonlySet<string> = new Set([
  'MOBILE',
  'FIXED_LINE_OR_MOBILE',
]);

const storedShape = (phone: PhoneNumber | undefined): string | null =>
  phone !== undefined &&
  phone.isValid() &&
  mobileTypes.has(phone.getType() ?? '')
    ? `+${phone.countryCallingCode} ${phone.nationalNumber}`
    : null;

export const normalizeContactPhone = (
  phone: string | null | undefined,
): string | null => {
  const trimmed = phone?.trim() ?? '';
  if (trimmed === '') return null;
  return storedShape(parsePhoneNumberFromString(trimmed, 'BO')) ?? trimmed;
};

/** A normalized phone that is a mobile, stored with its country code. */
export const isStorableMobile = (stored: string): boolean =>
  stored.startsWith('+') &&
  storedShape(parsePhoneNumberFromString(stored)) === stored;

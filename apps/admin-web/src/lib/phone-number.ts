// FIX-037: a mobile number with a country code, stored as «+<code> <digits>».
// The rules come from Google's libphonenumber metadata through
// `@pilates/phone-number`, which the apps share through mobile-core.
import {
  phoneProblem as anyonesPhoneProblem,
  theirPhoneRequiredMessage,
  type PhoneCountry,
} from "@pilates/phone-number";

export {
  bolivia,
  frequentPhoneCountries,
  parseStoredPhone,
  phoneCountries,
  phoneCountryByIso,
  phonePlaceholder,
  phoneWithFlag,
  searchPhoneCountries,
  storedPhone,
  type PhoneCountry,
} from "@pilates/phone-number";

// Verification n.º 41: every admin form types someone else's number, so the
// web asks in the third person (the apps' own forms keep «tu celular»).
export const phoneRequiredMessage = theirPhoneRequiredMessage;

/** Null when the number is a mobile of the country, else the line to show. */
export const phoneProblem = (
  target: PhoneCountry,
  typed: string,
): string | null => anyonesPhoneProblem(target, typed, "theirs");

// The one place that reads libphonenumber-js, with Google's full ("max")
// metadata: which numbers are valid, which are mobiles, and which country a
// number belongs to. No digit, length or prefix rule is written by hand here.
import {
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from "libphonenumber-js/core";
import examples from "libphonenumber-js/mobile/examples";
import metadata from "libphonenumber-js/max/metadata";

/** A mobile's calling code and national digits, as the database stores them. */
export type Mobile = { dial: string; national: string };

// A US or Canadian number can be either, so it counts as a mobile.
const mobileTypes: ReadonlySet<string> = new Set(["MOBILE", "FIXED_LINE_OR_MOBILE"]);

const asMobile = (parsed: PhoneNumber | undefined): Mobile | null =>
  parsed !== undefined && parsed.isValid() && mobileTypes.has(parsed.getType() ?? "")
    ? { dial: parsed.countryCallingCode, national: parsed.nationalNumber }
    : null;

export const callingCodeOf = (iso: string): string =>
  getCountryCallingCode(iso as CountryCode, metadata);

/**
 * A number typed for a country, with or without its code, spaces or dashes.
 * The country picks the calling code; libphonenumber decides whether the
 * digits are a valid mobile in that code's plan.
 */
export const typedMobile = (iso: string, typed: string): Mobile | null => {
  const mobile = asMobile(parsePhoneNumberFromString(typed, iso as CountryCode, metadata));
  return mobile?.dial === callingCodeOf(iso) ? mobile : null;
};

/** A stored «+<code> <digits>», read strictly: the digits must be the national number. */
export const storedMobile = (dial: string, digits: string): Mobile | null => {
  const mobile = asMobile(parsePhoneNumberFromString(`+${dial}${digits}`, metadata));
  return mobile?.national === digits ? mobile : null;
};

/** The country a stored number belongs to, else its code's main country. */
export const countryOfNumber = (dial: string, digits: string): string | undefined =>
  parsePhoneNumberFromString(`+${dial}${digits}`, metadata)?.country ??
  metadata.country_calling_codes[dial]?.[0];

export const exampleMobileLength = (iso: string): number | undefined =>
  getExampleNumber(iso as CountryCode, examples, metadata)?.nationalNumber.length;

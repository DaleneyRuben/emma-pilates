// FIX-037 (DES-006, follow-up 236): a mobile number with a country code,
// stored as «+<code> <digits>». The rules come from Google's libphonenumber
// metadata through `@pilates/phone-number`, which the admin web shares.
export {
  bolivia,
  frequentPhoneCountries,
  parseStoredPhone,
  phoneCountries,
  phoneCountryByIso,
  phonePlaceholder,
  phoneProblem,
  phoneRequiredMessage,
  phoneWithFlag,
  searchPhoneCountries,
  storedPhone,
  theirPhoneRequiredMessage,
  type PhoneCountry,
} from "@pilates/phone-number";

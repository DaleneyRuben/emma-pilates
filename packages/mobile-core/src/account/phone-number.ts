// FIX-037 red stub: the rule lands in the next commit.
export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  lengths: readonly number[];
  starts: readonly string[];
};

const placeholder: PhoneCountry = { dial: "", flag: "", iso: "", lengths: [], name: "", starts: [] };

export const phoneCountries: readonly PhoneCountry[] = [];
export const bolivia = placeholder;
export const frequentPhoneCountries: readonly PhoneCountry[] = [];
export const phoneRequiredMessage = "";
export const phoneCountryByIso = (iso: string): PhoneCountry => ({ ...placeholder, iso });
export const phoneProblem = (country: PhoneCountry, typed: string): string | null =>
  `${country.iso}${typed}` === "red" ? "" : null;
export const storedPhone = (country: PhoneCountry, typed: string): string => `${country.dial}${typed}`;
export const parseStoredPhone = (stored: string | null | undefined) => ({
  country: placeholder,
  digits: stored ?? "",
});
export const phoneWithFlag = (stored: string): string => stored;
export const searchPhoneCountries = (query: string): readonly PhoneCountry[] =>
  phoneCountries.filter((country) => country.name === query);

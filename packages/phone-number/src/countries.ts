import { countryNames } from "./generated/country-names";
import { callingCodeOf } from "./libphonenumber";

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

// The two regional indicator letters of the ISO code draw the flag.
const flagOf = (iso: string): string =>
  String.fromCodePoint(...[...iso].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));

/** Every country libphonenumber knows, A–Z by its Spanish name. */
export const phoneCountries: readonly PhoneCountry[] = countryNames.map(([iso, name]) => ({
  dial: callingCodeOf(iso),
  flag: flagOf(iso),
  iso,
  name,
}));

const byIso = new Map(phoneCountries.map((country) => [country.iso, country]));

export const phoneCountryByIso = (iso: string): PhoneCountry => {
  const found = byIso.get(iso);
  if (found === undefined) throw new Error(`Unknown phone country ${iso}`);
  return found;
};

export const findPhoneCountry = (iso: string | undefined): PhoneCountry | undefined =>
  iso === undefined ? undefined : byIso.get(iso);

export const bolivia = phoneCountryByIso("BO");

/** «Frecuentes» in the country list, after the chosen country. */
export const frequentPhoneCountries: readonly PhoneCountry[] = ["AR", "BR", "CL", "PE", "PY"].map(
  phoneCountryByIso,
);

const folded = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const searchPhoneCountries = (query: string): readonly PhoneCountry[] => {
  const wanted = folded(query.trim());
  if (wanted === "") return phoneCountries;
  const code = wanted.replace(/^\+/, "");
  return phoneCountries.filter((candidate) =>
    /^\d+$/.test(code) ? candidate.dial.startsWith(code) : folded(candidate.name).includes(wanted),
  );
};

// FIX-037 (DES-006, follow-up 236): a mobile number with a country code. Any
// country is stored as «+<code> <digits>»; Bolivia keeps FIX-036's rule
// (§19.20: 8 digits starting with 6 or 7, +591 implicit). This is a copy of
// `packages/mobile-core/src/account/phone-number.ts` (the admin web cannot
// depend on mobile-core; only the regex reads differ, for this package's
// noUncheckedIndexedAccess): change both together. The backend checks the
// stored shape in `apps/backend/src/phone/bolivian-mobile.ts`.
export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  /** How many national digits a mobile has (without the country code). */
  lengths: readonly number[];
  /** The digits a mobile starts with; empty when any digit will do. */
  starts: readonly string[];
};

const country = (
  iso: string,
  name: string,
  dial: string,
  flag: string,
  lengths: readonly number[],
  starts: readonly string[],
): PhoneCountry => ({ dial, flag, iso, lengths, name, starts });

/** A–Z by name; the first country with a shared code (+1) owns its flag. */
export const phoneCountries: readonly PhoneCountry[] = [
  country("DE", "Alemania", "49", "🇩🇪", [10, 11], ["1"]),
  country("AR", "Argentina", "54", "🇦🇷", [11], ["9"]),
  country("BO", "Bolivia", "591", "🇧🇴", [8], ["6", "7"]),
  country("BR", "Brasil", "55", "🇧🇷", [11], []),
  country("CA", "Canadá", "1", "🇨🇦", [10], []),
  country("CL", "Chile", "56", "🇨🇱", [9], ["9"]),
  country("CO", "Colombia", "57", "🇨🇴", [10], ["3"]),
  country("EC", "Ecuador", "593", "🇪🇨", [9], ["9"]),
  country("ES", "España", "34", "🇪🇸", [9], ["6", "7"]),
  country("US", "Estados Unidos", "1", "🇺🇸", [10], []),
  country("FR", "Francia", "33", "🇫🇷", [9], ["6", "7"]),
  country("IT", "Italia", "39", "🇮🇹", [9, 10], ["3"]),
  country("MX", "México", "52", "🇲🇽", [10], []),
  country("PY", "Paraguay", "595", "🇵🇾", [9], ["9"]),
  country("PE", "Perú", "51", "🇵🇪", [9], ["9"]),
  country("UY", "Uruguay", "598", "🇺🇾", [8], ["9"]),
  country("VE", "Venezuela", "58", "🇻🇪", [10], ["4"]),
];

export const phoneCountryByIso = (iso: string): PhoneCountry => {
  const found = phoneCountries.find((candidate) => candidate.iso === iso);
  if (found === undefined) throw new Error(`Unknown phone country ${iso}`);
  return found;
};

export const bolivia = phoneCountryByIso("BO");

/** «Frecuentes» in the country list, after the chosen country. */
export const frequentPhoneCountries: readonly PhoneCountry[] = [
  "AR",
  "BR",
  "CL",
  "PE",
  "PY",
].map(phoneCountryByIso);

/** For +1 the list order decides: Estados Unidos is drawn for a stored +1. */
const flagOwner = (dial: string): PhoneCountry | undefined =>
  dial === "1"
    ? phoneCountryByIso("US")
    : phoneCountries.find((c) => c.dial === dial);

// Verification n.º 41: every admin form types someone else's number, so the
// web asks in the third person (the apps' own forms keep «tu celular»).
export const phoneRequiredMessage =
  "Escribe su celular. Lo necesitamos para escribirle por WhatsApp.";

// «o» becomes «u» before a word that starts with an o sound: «10 u 11», «7 u 8».
const alternatives = (values: readonly (string | number)[]): string => {
  const last = String(values[values.length - 1]);
  if (values.length === 1) return last;
  const joiner = last === "8" || last === "11" ? "u" : "o";
  return `${values.slice(0, -1).join(", ")} ${joiner} ${last}`;
};

const ruleMessage = (target: PhoneCountry): string =>
  `Un celular de ${target.name} tiene ${alternatives(target.lengths)} dígitos` +
  (target.starts.length === 0
    ? "."
    : ` y empieza con ${alternatives(target.starts)}.`);

/** The national digits typed, without spaces, dashes or a typed country code. */
const nationalDigits = (target: PhoneCountry, typed: string): string => {
  const digits = typed.replace(/\D/g, "");
  const withoutCode = digits.slice(target.dial.length);
  const typedCode =
    (typed.trim().startsWith("+") || !target.lengths.includes(digits.length)) &&
    digits.startsWith(target.dial) &&
    target.lengths.includes(withoutCode.length);
  return typedCode ? withoutCode : digits;
};

/** Null when the number fits the country's mobiles, else the line to show. */
export const phoneProblem = (
  target: PhoneCountry,
  typed: string,
): string | null => {
  if (typed.trim() === "") return phoneRequiredMessage;
  const digits = nationalDigits(target, typed);
  const fits =
    target.lengths.includes(digits.length) &&
    (target.starts.length === 0 ||
      target.starts.some((start) => digits.startsWith(start)));
  return fits ? null : ruleMessage(target);
};

export const storedPhone = (target: PhoneCountry, typed: string): string =>
  `+${target.dial} ${nationalDigits(target, typed)}`;

/** A stored number back into the field: its country and digits. */
export const parseStoredPhone = (
  stored: string | null | undefined,
): { country: PhoneCountry; digits: string } => {
  // «+<code> <digits>», or a number saved before FIX-037 with spaces or dashes.
  const [, dial, digits] =
    /^\+(\d{1,3})[\s-]+(\d[\d\s-]*)$/.exec(stored?.trim() ?? "") ?? [];
  const owner = dial === undefined ? undefined : flagOwner(dial);
  if (owner !== undefined && digits !== undefined)
    return { country: owner, digits: digits.replace(/\D/g, "") };
  return { country: bolivia, digits: (stored ?? "").replace(/\D/g, "") };
};

/** «🇧🇴 +591 70712345» in lists; anything else is shown as stored. */
export const phoneWithFlag = (stored: string): string => {
  const [, dial] = /^\+(\d{1,3}) \d+$/.exec(stored.trim()) ?? [];
  const owner = dial === undefined ? undefined : flagOwner(dial);
  return owner === undefined ? stored : `${owner.flag} ${stored.trim()}`;
};

const folded = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const searchPhoneCountries = (
  query: string,
): readonly PhoneCountry[] => {
  const wanted = folded(query.trim());
  if (wanted === "") return phoneCountries;
  const code = wanted.replace(/^\+/, "");
  return phoneCountries.filter((candidate) =>
    /^\d+$/.test(code)
      ? candidate.dial.startsWith(code)
      : folded(candidate.name).includes(wanted),
  );
};
